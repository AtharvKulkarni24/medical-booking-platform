export default function TestCard({ name, description, icon, onClick }) {
  return (
    // Added the onClick handler here
    <div 
      onClick={() => onClick(name)} 
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer flex flex-col items-center text-center group"
    >
      <div className="text-4xl mb-4 p-4 bg-blue-50 rounded-full group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">
        {name}
      </h3>
      <p className="text-sm text-gray-500 flex-grow">
        {description}
      </p>
      <button className="mt-4 text-blue-600 font-medium text-sm hover:underline mt-auto">
        View Labs &rarr;
      </button>
    </div>
  )
}