import { useState } from 'react';
import { WorkspacePage, SummaryStrip, Toolbar, TankRow } from './WorkspaceUI';
import { useWorkspaceData } from './workspaceData';

export default function WorkspaceTanks() {
  const { tanks, stages, bays } = useWorkspaceData();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [stage, setStage] = useState('all');
  const [bay, setBay] = useState('all');
  const filtered = tanks.filter((tank) => {
    const needle = query.toLowerCase();
    return (!needle || `${tank.id} ${tank.ohNumber}`.toLowerCase().includes(needle)) && (status === 'all' || tank.status === status) && (stage === 'all' || tank.currentStageId === stage) && (bay === 'all' || tank.currentBayId === bay);
  });
  return <WorkspacePage title="My Tanks" subtitle="Tanks currently assigned to me / my gang">
    <SummaryStrip items={[{ label: 'Assigned', value: tanks.length }, { label: 'Active', value: tanks.filter((tank) => tank.status === 'active').length, tone: 'text-status-active' }, { label: 'At Risk', value: tanks.filter((tank) => tank.status === 'warning').length, tone: 'text-status-warning' }, { label: 'Blocked', value: tanks.filter((tank) => tank.status === 'critical').length, tone: 'text-status-critical' }, { label: 'Completed', value: tanks.filter((tank) => tank.status === 'completed').length, tone: 'text-status-completed' }]} />
    <Toolbar search={query} onSearch={setQuery}><select className="select-field md:w-36" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="warning">At risk</option><option value="critical">Blocked</option><option value="completed">Completed</option></select><select className="select-field md:w-40" value={stage} onChange={(event) => setStage(event.target.value)}><option value="all">All stages</option>{stages.map((item) => <option key={item.id} value={item.id}>Stage {item.number} · {item.shortName}</option>)}</select><select className="select-field md:w-36" value={bay} onChange={(event) => setBay(event.target.value)}><option value="all">All bays</option>{bays.map((item) => <option key={item.id} value={item.id}>Bay {item.number}</option>)}</select></Toolbar>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{filtered.map((tank) => <TankRow key={tank.id} tank={tank} nextAction={tank.blockerReason ? 'Review blocker' : tank.status === 'completed' ? 'View completion' : 'Continue process'} />)}</div>
    {filtered.length === 0 && <div className="card p-8 text-center text-sm text-text-tertiary">No assigned tanks match these filters.</div>}
  </WorkspacePage>;
}
