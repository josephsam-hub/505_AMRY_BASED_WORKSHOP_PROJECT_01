import assert from 'node:assert';
import { createToken, verifyToken } from '../server/src/middleware/auth.ts';
import { processes as seedProcesses } from '../src/data/processes.ts';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 8.1 VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // ── TEST SUITE 1: Security & Token Authentication ────────────
  console.log('── Suite 1: Security & Token Authentication ──');

  test('createToken generates a signed token with payload and HMAC signature', () => {
    const token = createToken({ id: 'USR-001', roles: ['admin'], gangIds: ['G01'] });
    assert(token.includes('.'), 'Token must contain payload.signature separator');
    const [payloadB64, sig] = token.split('.');
    assert(payloadB64 && sig, 'Both payload and signature must be present');
  });

  test('verifyToken accepts a validly signed token and rejects tampered payload', () => {
    const token = createToken({ id: 'USR-001', roles: ['user'], gangIds: ['G02'] });
    const verified = verifyToken(token);
    assert(verified !== null, 'Token should verify successfully');
    assert.strictEqual(verified?.id, 'USR-001');
    assert.deepStrictEqual(verified?.roles, ['user']);

    // Attempt tampering: escalate to admin role
    const [payloadB64, sig] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ id: 'USR-001', roles: ['admin'], gangIds: ['G02'], exp: Date.now() + 100000 })
    ).toString('base64url');
    const tamperedToken = `${tamperedPayload}.${sig}`;
    const tamperedResult = verifyToken(tamperedToken);
    assert.strictEqual(tamperedResult, null, 'Tampered token must be rejected');
  });

  test('verifyToken supports deterministic dev tokens', () => {
    const adminDev = verifyToken('dev-token-admin');
    assert(adminDev !== null);
    assert(adminDev.roles.includes('admin'));

    const userDev = verifyToken('dev-token-user');
    assert(userDev !== null);
    assert(userDev.roles.includes('user'));

    const invalid = verifyToken('arbitrary-invalid-token');
    assert.strictEqual(invalid, null);
  });

  // ── TEST SUITE 2: PERT & 31 Production Processes DAG ───────────
  console.log('\n── Suite 2: PERT 31 Production Processes DAG ──');

  test('Seed dataset contains exactly 31 processes with valid stage assignments', () => {
    assert.strictEqual(seedProcesses.length, 31, 'Expected exactly 31 production processes');
    for (const p of seedProcesses) {
      assert(p.id.startsWith('P'), `Process ${p.id} has invalid ID prefix`);
      assert(p.stageId.startsWith('S'), `Process ${p.id} has invalid stageId`);
      assert(p.standardDurationDays > 0, `Process ${p.id} must have positive duration`);
    }
  });

  test('Process dependencies form a valid DAG with no self-cycles or unknown references', () => {
    const processMap = new Map(seedProcesses.map((p) => [p.id, p]));
    for (const p of seedProcesses) {
      for (const depId of p.dependencies) {
        assert(processMap.has(depId), `Process ${p.id} references non-existent dependency ${depId}`);
        assert.notStrictEqual(depId, p.id, `Process ${p.id} cannot depend on itself`);
      }
    }
  });

  // ── TEST SUITE 3: Source Provenance Integrity ─────────────────
  console.log('\n── Suite 3: Source Provenance & Anti-Fabrication ──');

  test('Source schedule file exists and contains preserved provenance records', () => {
    const sourcePath = join(process.cwd(), 'data', 'source', 'production_schedule.json');
    assert(existsSync(sourcePath), 'Source schedule JSON must exist');
    const data = JSON.parse(readFileSync(sourcePath, 'utf8'));
    assert(Array.isArray(data), 'Source data must be an array');
    assert(data.length >= 41, 'Must contain the 41 original extracted schedule rows');
    
    // Verify records are marked with parsing status and not fabricated
    const ambiguousRows = data.filter((r: any) => r.parsing_status === 'AMBIGUOUS' || r.parsing_status === 'SKIPPED_UNREADABLE');
    assert(ambiguousRows.length > 0, 'Ambiguous/unread scanned rows must be preserved without hallucinated numbers');
  });

  // ── TEST SUITE 4: Simulation Store Mutation & Persistence ─────
  console.log('\n── Suite 4: Simulation Store Lifecycle & Operations ──');

  test('Simulation Store state operations can be imported and executed', async () => {
    const { simulationStore } = await import('../src/services/simulation/simulationStore.ts');
    const initialTanks = simulationStore.getTanks();
    assert(initialTanks.length >= 20, 'Simulation store must initialize at least 20 tanks');

    // Test process update
    const tank = initialTanks[0];
    assert(tank, 'Tank 0 must exist');
    const prevOverall = tank.overallProgress;
    
    const updated = simulationStore.createProcessUpdate({
      tankId: tank.id,
      processId: tank.currentProcessId,
      status: 'in_progress',
      progress: Math.min(100, tank.processProgress + 10),
      notes: 'Automated test progress update',
      updatedBy: 'TestRunner',
    });

    assert(updated !== null, 'Process update should succeed');
    const refetched = simulationStore.getTankById(tank.id);
    assert(refetched !== null, 'Tank must be fetchable');
    assert(refetched.processProgress >= tank.processProgress, 'Process progress should have incremented');

    // Test Inspection workflow
    const inspection = simulationStore.createInspection({
      tankId: tank.id,
      processId: tank.currentProcessId,
      stageId: tank.currentStageId,
      name: 'Pre-Rollout QA Check',
      scheduledDate: new Date().toISOString().split('T')[0],
      inspector: 'Inspector QA-01',
    });
    assert(inspection.id.startsWith('INSP-'), 'Inspection must receive INSP- ID');
    assert.strictEqual(inspection.status, 'SCHEDULED');

    // Evaluate inspection
    const evaluated = simulationStore.evaluateInspection(inspection.id, 'PASSED', 'Passed with zero issues');
    assert.strictEqual(evaluated?.status, 'PASSED');

    // Test Defect workflow
    const defect = simulationStore.createDefect({
      tankId: tank.id,
      processId: tank.currentProcessId,
      stageId: tank.currentStageId,
      description: 'Minor hydraulic hose clamp seepage',
      severity: 'minor',
      category: 'Mechanical',
      reportedBy: 'Test Runner',
    });
    assert(defect.id.startsWith('DEF-'), 'Defect must receive DEF- ID');
    assert.strictEqual(defect.status, 'open');

    // Update defect status
    const resolved = simulationStore.updateDefectStatus(defect.id, 'resolved');
    assert.strictEqual(resolved?.status, 'resolved');

    // Test Bay Assignment
    const bays = simulationStore.getBays();
    if (bays.length > 0) {
      const bay = bays[0];
      const assignedBay = simulationStore.assignTankToBay(bay.id, tank.id);
      assert.strictEqual(assignedBay?.currentTankId, tank.id);
    }

    // Test Notification read
    const notifs = simulationStore.getNotifications();
    if (notifs.length > 0) {
      const notif = notifs[0];
      const readNotif = simulationStore.markNotificationRead(notif.id);
      assert.strictEqual(readNotif?.read, true);
    }
  });

  // ── TEST SUITE 5: API Simulation Handler Mapping ─────────────
  console.log('\n── Suite 5: Simulation API Request Handler ──');

  test('handleSimulationApiRequest correctly resolves all operational endpoints', async () => {
    const { handleSimulationApiRequest } = await import('../src/services/simulation/simulationApiHandler.ts');

    // GET /api/tanks
    const tanksRes = await handleSimulationApiRequest('/api/tanks', { method: 'GET' });
    assert(tanksRes.success === true && Array.isArray(tanksRes.data));
    assert(tanksRes.data.length >= 20);

    // GET /api/workshop/bays
    const baysRes = await handleSimulationApiRequest('/api/workshop/bays', { method: 'GET' });
    assert(baysRes.success === true && Array.isArray(baysRes.data));

    // GET /api/stages
    const stagesRes = await handleSimulationApiRequest('/api/stages', { method: 'GET' });
    assert(stagesRes.success === true && stagesRes.data.length === 6);

    // GET /api/processes
    const procRes = await handleSimulationApiRequest('/api/processes', { method: 'GET' });
    assert(procRes.success === true && procRes.data.length === 31);

    // GET /api/data-quality
    const dqRes = await handleSimulationApiRequest('/api/data-quality', { method: 'GET' });
    assert(dqRes.success === true);
    assert.strictEqual(dqRes.data.isSimulation, true);
  });

  console.log('\n====================================================');
  console.log(`🏁 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
