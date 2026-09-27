import React, { useState } from 'react';

interface AlertsNotificationsProps {
  onNavigate: (path: string) => void;
}

export const AlertsNotifications: React.FC<AlertsNotificationsProps> = ({ onNavigate }) => {
  const [alerts, setAlerts] = useState([
    {
      id: 'alt-1',
      title: 'Heavy Machinery Gross Margin Compression',
      severity: 'Critical',
      time: '12m ago',
      desc: 'Gross margin fell below 35.0% threshold (realized 34.2%) due to European raw material surcharge index.',
      status: 'Active',
      color: 'bg-red-500',
    },
    {
      id: 'alt-2',
      title: 'SAP BTP Vector Buffer Exceeding 95%',
      severity: 'Warning',
      time: '48m ago',
      desc: 'In-memory buffer utilized at 98.4%. Scheduled automatic compaction will run at 02:00 UTC.',
      status: 'Acknowledged',
      color: 'bg-amber-500',
    },
    {
      id: 'alt-3',
      title: 'Robotics & Automation Outperformance',
      severity: 'Info',
      time: '2h ago',
      desc: 'SKU X-400 exceeded quarterly revenue plan by +14.8%. Auto-scaling allocation recommendations generated.',
      status: 'Resolved',
      color: 'bg-emerald-500',
    },
    {
      id: 'alt-4',
      title: 'Order SO-106760 Validation Passed',
      severity: 'Info',
      time: '5h ago',
      desc: 'Tax compliance verified across German DAX enterprise delivery pipeline.',
      status: 'Resolved',
      color: 'bg-neutral-500',
    },
  ]);

  const [filter, setFilter] = useState<'All' | 'Active' | 'Resolved'>('All');

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'All') return true;
    if (filter === 'Active') return a.status === 'Active' || a.status === 'Acknowledged';
    return a.status === 'Resolved';
  });

  const toggleAcknowledge = (id: string) => {
    setAlerts(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, status: a.status === 'Active' ? 'Acknowledged' : 'Resolved' };
      }
      return a;
    }));
  };

  return (
    <div className="flex flex-col w-full gap-space-xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span className="font-label-sm uppercase tracking-widest text-outline font-semibold">
              REAL-TIME MONITORING · SAP HANA HEALTH
            </span>
          </div>
          <h1 className="font-headline-xl text-on-surface font-semibold tracking-tight">
            Alerts & Notifications
          </h1>
          <p className="font-body-md text-on-surface-variant mt-1">
            Real-time threshold breaches, automated margin anomaly warnings, and vector indexing triggers.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-end mt-2 md:mt-0">
          <button 
            onClick={() => setAlerts(prev => prev.map(a => ({ ...a, status: 'Resolved' })))}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors shadow-sm border border-[#e2e3e1] whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-outline">done_all</span>
            <span>Mark All Resolved</span>
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-[#eeeeec] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eeeeec] pb-4">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm font-semibold">System Notification Stream</span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container text-xs font-mono">
              {filteredAlerts.length} Events
            </span>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-full bg-surface-container-lowest border border-[#e2e3e1] shadow-2xs self-start sm:self-auto">
            {(['All', 'Active', 'Resolved'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`h-8 px-4 rounded-full text-xs font-medium transition-colors flex items-center justify-center whitespace-nowrap ${
                  filter === tab
                    ? 'bg-surface-container text-on-surface font-semibold shadow-xs'
                    : 'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredAlerts.map(alert => (
            <div 
              key={alert.id}
              className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 border border-[#eeeeec]"
            >
              <div className="flex items-start gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${alert.color} mt-1.5 shrink-0`}></span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-label-md font-semibold text-on-surface">{alert.title}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-container text-outline">
                      {alert.severity}
                    </span>
                    <span className="text-xs text-outline">{alert.time}</span>
                  </div>
                  <p className="font-body-sm text-outline mt-1 max-w-2xl">{alert.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  alert.status === 'Active' ? 'bg-red-50 text-red-700' :
                  alert.status === 'Acknowledged' ? 'bg-amber-50 text-amber-700' :
                  'bg-emerald-50 text-emerald-700'
                }`}>
                  {alert.status}
                </span>
                {alert.status !== 'Resolved' && (
                  <button 
                    onClick={() => toggleAcknowledge(alert.id)}
                    className="px-3 py-1 rounded-full bg-white hover:bg-neutral-100 text-xs font-medium border border-[#dadad8] transition-colors"
                  >
                    {alert.status === 'Active' ? 'Acknowledge' : 'Resolve'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
