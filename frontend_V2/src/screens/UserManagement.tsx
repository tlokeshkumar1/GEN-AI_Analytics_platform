import React, { useState } from 'react';

interface UserManagementProps {
  onNavigate: (path: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onNavigate }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const [users] = useState([
    {
      id: 'usr-1',
      name: 'Lokesh Kumar',
      email: 'lokeshkumartelagamalla@gmail.com',
      role: 'Analytics Director',
      tier: 'Tier-1 Admin',
      status: 'Active',
      lastLogin: 'Active Now',
    },
    {
      id: 'usr-2',
      name: 'Marcus Vance',
      email: 'm.vance@neovatic-enterprise.com',
      role: 'Chief Revenue Officer',
      tier: 'Executive Viewer',
      status: 'Active',
      lastLogin: '3h ago',
    },
    {
      id: 'usr-3',
      name: 'Dr. Elena Rostova',
      email: 'elena.rostova@neovatic-ai.de',
      role: 'Lead Data Architect',
      tier: 'Tier-1 Admin',
      status: 'Active',
      lastLogin: 'Yesterday',
    },
    {
      id: 'usr-4',
      name: 'Kenji Takahashi',
      email: 'kenji.takahashi@apac-sales.jp',
      role: 'APAC Commercial VP',
      tier: 'Business Analyst',
      status: 'Active',
      lastLogin: '2d ago',
    },
  ]);

  return (
    <div className="flex flex-col w-full gap-space-xl">
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#111111] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 font-label-md text-label-md animate-in fade-in">
          <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
            <span className="font-label-sm uppercase tracking-widest text-[#64748B] font-semibold">
              SECURITY AUDIT · RBAC ACCESS CONTROLS
            </span>
          </div>
          <h1 className="font-headline-xl text-[#0F172A] font-semibold tracking-tight">
            User Management & RBAC Roles
          </h1>
          <p className="font-body-md text-[#475569] mt-1">
            Enterprise identity governance linked with SAP BTP Trust Configuration and OAuth SSO.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-end mt-2 md:mt-0">
          <button 
            onClick={() => showToast('Operator invitation link copied and dispatched')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-white text-[#0F172A] font-label-md text-label-md hover:bg-[#F1F5F9] transition-colors shadow-xs border border-[#CBD5E1] whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-[#2563EB]">person_add</span>
            <span>Invite Operator</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] overflow-hidden">
        <div className="p-space-lg border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm font-semibold text-[#0F172A]">Enterprise Operator Accounts</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-xs font-mono text-[#475569] border border-[#E2E8F0]">
              {users.length} Active Accounts
            </span>
          </div>
          <span className="text-xs text-[#64748B]">BTP Identity Authentication Service (IAS)</span>
        </div>

        <div className="overflow-x-auto scroll-touch">
          <table className="w-full text-left font-body-sm text-body-sm min-w-[580px]">
            <thead>
              <tr className="bg-[#F8FAFC] text-[#475569] font-label-md uppercase tracking-wider border-b border-[#E2E8F0]">
                <th className="py-3 px-6 font-semibold">User / Identity</th>
                <th className="py-3 px-6 font-semibold">Role Descriptor</th>
                <th className="py-3 px-6 font-semibold">Security Tier</th>
                <th className="py-3 px-6 font-semibold">Status</th>
                <th className="py-3 px-6 font-semibold text-right">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center font-semibold text-xs border border-[#BFDBFE]">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-[#0F172A]">{u.name}</div>
                        <div className="text-xs text-[#64748B]">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-[#0F172A] font-medium">{u.role}</td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#F1F5F9] text-xs font-mono text-[#334155] border border-[#E2E8F0] font-medium">
                      {u.tier}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] text-xs font-medium">
                      {u.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-mono text-[#64748B]">{u.lastLogin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
