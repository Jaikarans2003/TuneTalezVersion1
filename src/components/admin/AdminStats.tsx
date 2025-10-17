'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

interface StatsData {
  totalUsers: number;
  totalBooks: number;
  totalPdfs: number;
  recentUsers: number;
  recentBooks: number;
  recentPdfs: number;
}

export default function AdminStats() {
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    totalBooks: 0,
    totalPdfs: 0,
    recentUsers: 0,
    recentBooks: 0,
    recentPdfs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Get total counts
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const booksSnapshot = await getDocs(collection(db, 'books'));
        const pdfsSnapshot = await getDocs(collection(db, 'pdfs'));

        // Get recent counts (last 7 days)
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        
        const recentUsersQuery = query(
          collection(db, 'users'),
          where('createdAt', '>=', oneWeekAgo)
        );
        const recentBooksQuery = query(
          collection(db, 'books'),
          where('createdAt', '>=', oneWeekAgo)
        );
        const recentPdfsQuery = query(
          collection(db, 'pdfs'),
          where('createdAt', '>=', oneWeekAgo)
        );

        const recentUsersSnapshot = await getDocs(recentUsersQuery);
        const recentBooksSnapshot = await getDocs(recentBooksQuery);
        const recentPdfsSnapshot = await getDocs(recentPdfsQuery);

        setStats({
          totalUsers: usersSnapshot.size,
          totalBooks: booksSnapshot.size,
          totalPdfs: pdfsSnapshot.size,
          recentUsers: recentUsersSnapshot.size,
          recentBooks: recentBooksSnapshot.size,
          recentPdfs: recentPdfsSnapshot.size
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FF0000]"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-[#FF0000]">Platform Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Users" value={stats.totalUsers} />
        <StatCard title="Total Books" value={stats.totalBooks} />
        <StatCard title="Total PDFs" value={stats.totalPdfs} />
      </div>
      
      <h3 className="text-lg font-medium mb-3 text-[#FF0000]">Last 7 Days</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="New Users" value={stats.recentUsers} />
        <StatCard title="New Books" value={stats.recentBooks} />
        <StatCard title="New PDFs" value={stats.recentPdfs} />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-[#1F1F1F] p-4 rounded-lg shadow border border-[#333333]">
      <h3 className="text-sm font-medium text-[#FF0000]">{title}</h3>
      <p className="text-2xl font-bold mt-1 text-white">{value}</p>
    </div>
  );
}
