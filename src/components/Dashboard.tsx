
import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import { motion } from 'framer-motion';
import UploadProcess from './UploadProcess';
import GridView from './GridView';
import KanbanBoard from './KanbanBoard';
import Analytics from './Analytics';

// Tab configuration
const tabs = [
  { name: 'Upload & Process', component: UploadProcess },
  { name: 'Grid View', component: GridView },
  { name: 'Kanban', component: KanbanBoard },
  { name: 'Analytics', component: Analytics },
];

const Dashboard = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-8">
            {tabs.map((tab, index) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 
                   ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:ring-2 focus:outline-none
                   ${selected 
                     ? 'bg-white shadow text-blue-700 dark:bg-gray-800 dark:text-blue-300' 
                     : 'text-blue-100 hover:bg-white/[0.12] hover:text-white dark:text-blue-200'
                   }`
                }
              >
                {tab.name}
              </Tab>
            ))}
          </Tab.List>
          
          <Tab.Panels className="mt-2">
            {tabs.map((tab, index) => (
              <Tab.Panel
                key={index}
                className="rounded-xl bg-white dark:bg-gray-800 p-3"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <tab.component />
                </motion.div>
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default Dashboard;
