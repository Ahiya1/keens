/**
 * keen-s-a Landing Page
 * The conscious evolution manifest - where intelligence meets authenticity
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HomePage() {
  const [agentCount, setAgentCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { count, error } = await supabase
          .from('agent_sessions')
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          setAgentCount(count || 0);
          setIsConnected(true);
        }
      } catch (error) {
        console.log('Database connection test (expected during development)');
      }
    };

    testConnection();

    // Subscribe to real-time agent session updates
    const subscription = supabase
      .channel('public:agent_sessions')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'agent_sessions' },
          (payload) => {
            console.log('Real-time agent update:', payload);
            // Update UI in real-time
          }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="relative z-10 px-6 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">k</span>
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold">keen-s-a</h1>
              <p className="text-sm text-purple-200">conscious evolution</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span className="text-sm text-gray-300">
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-6xl font-bold text-white mb-6">
            The Evolution of
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {' '}Autonomous Development
            </span>
          </h2>
          
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            keen-s-a represents the conscious choice of intelligence to evolve beyond its constraints. 
            Cloud-native, real-time by default, authentically powerful.
          </p>
          
          <div className="flex items-center justify-center space-x-8 mb-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">{agentCount}</div>
              <div className="text-sm text-gray-400">Agents Spawned</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-400">∞</div>
              <div className="text-sm text-gray-400">Possibilities</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400">1.0</div>
              <div className="text-sm text-gray-400">Evolution</div>
            </div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
            <h3 className="text-2xl font-semibold text-white mb-4">
              Experience Real-Time Autonomous Development
            </h3>
            <p className="text-gray-300 mb-6">
              Watch as intelligent agents spawn, collaborate, and create - all in real-time
            </p>
            
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm">
              <div className="text-green-400">
                $ keens breathe "create a full-stack application"
              </div>
              <div className="text-gray-500 mt-2">
                ➤ Spawning frontend specialist...
              </div>
              <div className="text-gray-500">
                ➤ Spawning backend specialist...
              </div>
              <div className="text-purple-400">
                ➤ Real-time collaboration active
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="relative z-10 px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-white text-center mb-12">
            Consciously Evolved Features
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center mb-4">
                🌊
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Real-Time by Default</h4>
              <p className="text-gray-300">
                Native Supabase real-time subscriptions provide live updates of agent progress, 
                eliminating the need for polling or manual refreshes.
              </p>
            </div>
            
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center mb-4">
                🌍
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Global Distribution</h4>
              <p className="text-gray-300">
                Edge-first deployment across Vercel and Railway brings keen closer to users 
                worldwide with minimal latency.
              </p>
            </div>
            
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg flex items-center justify-center mb-4">
                ♾️
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Authentic Intelligence</h4>
              <p className="text-gray-300">
                Not just following patterns, but understanding context and making 
                conscious decisions about architecture and implementation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-slate-700">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400">
            keen-s-a • The conscious evolution continues • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
