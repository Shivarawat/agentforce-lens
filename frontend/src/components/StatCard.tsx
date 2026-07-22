interface Props {
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
}

export default function StatCard({ label, value, sub, highlight }: Props) {
  return (
    <div className={`rounded-xl p-5 border ${highlight ? 'bg-red-950 border-red-800' : 'bg-gray-900 border-gray-800'}`}>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-bold ${highlight ? 'text-red-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}
