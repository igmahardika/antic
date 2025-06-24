
import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import { motion } from 'framer-motion';
import { Upload, Grid3x3, Kanban, BarChart3 } from 'lucide-react';
import UploadProcess from './UploadProcess';
import GridView from './GridView';
import KanbanBoard from './KanbanBoard';
import Analytics from './Analytics';
import ModernHeader from './ModernHeader';

// Tab configuration with icons
const tabs = [
  { name: 'Upload & Process', component: UploadProcess, icon: Upload },
  { name: 'Grid View', component: GridView, icon: Grid3x3 },
  { name: 'Kanban', component: KanbanBoard, icon: Kanban },
  { name: 'Analytics', component: Analytics, icon: BarChart3 },
];

const Dashboard = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <ModernHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          {/* Enhanced Tab Navigation */}
          <div className="mb-8">
            <Tab.List className="flex p-1 space-x-1 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800">
              {tabs.map((tab, index) => (
                <Tab
                  key={tab.name}
                  className={({ selected }) =>
                    `relative flex items-center space-x-2 px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 ${
                      selected
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`
                  }
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                  {selectedIndex === index && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl -z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </Tab>
              ))}
            </Tab.List>
          </div>
          
          <Tab.Panels>
            {tabs.map((tab, index) => (
              <Tab.Panel key={index} className="focus:outline-none">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  <div className="p-8">
                    <tab.component />
                  </div>
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
