import { Film, UserCheck, Ticket } from 'lucide-react';

export default function Navbar({ users, currentUser, onSelectUser, onOpenBookings }) {
  return (
    <nav className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600 rounded-lg shadow-md shadow-indigo-600/30">
          <Film className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wide text-white flex items-center gap-2">
            CineMatch <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30 font-semibold">CognoDB Graph</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
    
        <button
          onClick={onOpenBookings}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm"
        >
          <Ticket className="w-4 h-4 text-indigo-400" />
          <span>My Tickets</span>
        </button>

       
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
          <UserCheck className="w-4 h-4 text-indigo-400 shrink-0 ml-1" />
          <span className="text-xs text-slate-400 hidden md:inline">Viewing as:</span>
          <select 
            value={currentUser?.id || ''} 
            onChange={(e) => onSelectUser(users.find(u => u.id === e.target.value))}
            className="bg-slate-800 text-white border border-slate-700 text-xs rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold cursor-pointer"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </nav>
  );
}