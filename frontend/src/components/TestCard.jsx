export default function TestCard({ name, description, icon, onClick }) {
  return (
    <div 
      onClick={() => onClick(name)} 
      className="glass-card hover-lift p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition duration-300 cursor-pointer flex flex-col justify-between group"
    >
      <div>
        <div className="text-4xl mb-4 p-4 bg-blue-50/80 rounded-2xl w-fit group-hover:scale-110 transition duration-300">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition">
          {name}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-blue-600 font-bold text-xs">
        <span>Find Certified Labs</span>
        <span className="group-hover:translate-x-1 transition">→</span>
      </div>
    </div>
  )
}