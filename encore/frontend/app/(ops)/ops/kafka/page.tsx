'use client';

import { useKafkaTopics } from '@/features/ops';
import { Server } from 'lucide-react';

export default function OpsKafkaPage() {
  const { data: topics, isLoading } = useKafkaTopics();

  if (isLoading) return <div className="p-8">READING BROKER METADATA...</div>;

  return (
    <div className="p-8 space-y-8 flex flex-col h-full">
      <h1 className="text-2xl font-bold uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
        <Server className="w-6 h-6" /> Kafka Clusters
      </h1>
      
      <p className="text-slate-500 text-xs">READ-ONLY: Broker configurations and consumer offsets.</p>

      <div className="flex-1 bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Topic Name</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Partitions</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Consumer Lag</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Bytes In/Sec</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Bytes Out/Sec</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {topics?.map(t => (
              <tr key={t.name} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 text-rose-300 font-bold">{t.name}</td>
                <td className="px-4 py-3 text-slate-300">{t.partitions}</td>
                <td className="px-4 py-3 text-amber-400">{t.consumerLag.toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-300 text-right">{(t.bytesInPerSec / 1024).toFixed(2)} KB/s</td>
                <td className="px-4 py-3 text-slate-300 text-right">{(t.bytesOutPerSec / 1024).toFixed(2)} KB/s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
