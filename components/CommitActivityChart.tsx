import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ICommit } from '../types';

interface Props {
  commits: ICommit[];
}

export const CommitActivityChart: React.FC<Props> = ({ commits }) => {
  // Group commits by date (simple visualization logic)
  const dataMap = commits.reduce((acc, commit) => {
    const date = new Date(commit.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.keys(dataMap).map(date => ({
    name: date,
    commits: dataMap[date]
  })).slice(-7); // Last 7 active days

  if (data.length === 0) {
      return <div className="text-xs text-gray-400 text-center p-4">Sem dados de atividade</div>;
  }

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="name" 
            tick={{fontSize: 10, fill: '#64748b'}} 
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px' }}
            itemStyle={{ color: '#fff' }}
            cursor={{fill: '#f1f5f9'}}
          />
          <Bar dataKey="commits" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};