
import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/hooks/use-toast';

interface Ticket {
  id: string;
  customerId: string;
  name: string;
  category: string;
  description: string;
  agent: string;
}

interface Agent {
  id: string;
  name: string;
  tickets: Ticket[];
}

const TicketCard = ({ ticket }: { ticket: Ticket }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
          {ticket.customerId}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {ticket.category}
        </span>
      </div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
        {ticket.name}
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
        {ticket.description}
      </p>
    </div>
  );
};

const AgentColumn = ({ agent }: { agent: Agent }) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-96">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {agent.name}
        </h3>
        <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
          {agent.tickets.length}
        </span>
      </div>
      <SortableContext items={agent.tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {agent.tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

const KanbanBoard = () => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'agent1',
      name: 'Agent Smith',
      tickets: [
        {
          id: 'ticket1',
          customerId: 'CUST001',
          name: 'John Doe',
          category: 'Technical',
          description: 'Login issue with mobile app',
          agent: 'agent1'
        },
        {
          id: 'ticket2',
          customerId: 'CUST004',
          name: 'Alice Brown',
          category: 'Support',
          description: 'Need help with dashboard navigation',
          agent: 'agent1'
        }
      ]
    },
    {
      id: 'agent2',
      name: 'Agent Johnson',
      tickets: [
        {
          id: 'ticket3',
          customerId: 'CUST002',
          name: 'Jane Smith',
          category: 'Billing',
          description: 'Payment not processed correctly',
          agent: 'agent2'
        }
      ]
    },
    {
      id: 'agent3',
      name: 'Agent Brown',
      tickets: [
        {
          id: 'ticket4',
          customerId: 'CUST003',
          name: 'Bob Wilson',
          category: 'Feature Request',
          description: 'Request for new dashboard features and improvements',
          agent: 'agent3'
        }
      ]
    }
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContainer = (id: string) => {
    for (const agent of agents) {
      if (agent.tickets.find(ticket => ticket.id === id)) {
        return agent.id;
      }
    }
    return null;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId) || overId;

    if (!activeContainer || !overContainer) return;

    const activeAgent = agents.find(agent => agent.id === activeContainer);
    const overAgent = agents.find(agent => agent.id === overContainer);

    if (!activeAgent || !overAgent) return;

    const activeTicket = activeAgent.tickets.find(ticket => ticket.id === activeId);
    if (!activeTicket) return;

    if (activeContainer !== overContainer) {
      // Moving between agents
      try {
        const response = await fetch(`/api/tickets/${activeId}/agent`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ agentId: overContainer }),
        });

        if (response.ok) {
          setAgents(prevAgents => {
            const newAgents = [...prevAgents];
            const activeAgentIndex = newAgents.findIndex(agent => agent.id === activeContainer);
            const overAgentIndex = newAgents.findIndex(agent => agent.id === overContainer);

            // Remove ticket from active agent
            newAgents[activeAgentIndex] = {
              ...newAgents[activeAgentIndex],
              tickets: newAgents[activeAgentIndex].tickets.filter(ticket => ticket.id !== activeId)
            };

            // Add ticket to over agent
            newAgents[overAgentIndex] = {
              ...newAgents[overAgentIndex],
              tickets: [...newAgents[overAgentIndex].tickets, { ...activeTicket, agent: overContainer }]
            };

            return newAgents;
          });

          toast({
            title: "Ticket berhasil dipindah",
            description: `Ticket telah dipindah ke ${overAgent.name}`,
          });
        } else {
          throw new Error('Failed to move ticket');
        }
      } catch (error) {
        toast({
          title: "Gagal memindah ticket",
          description: "Terjadi kesalahan saat memindah ticket. Silakan coba lagi.",
          variant: "destructive",
        });
      }
    } else {
      // Reordering within the same agent
      const activeIndex = activeAgent.tickets.findIndex(ticket => ticket.id === activeId);
      const overIndex = activeAgent.tickets.findIndex(ticket => ticket.id === overId);

      if (activeIndex !== overIndex) {
        setAgents(prevAgents => {
          const newAgents = [...prevAgents];
          const agentIndex = newAgents.findIndex(agent => agent.id === activeContainer);
          
          newAgents[agentIndex] = {
            ...newAgents[agentIndex],
            tickets: arrayMove(newAgents[agentIndex].tickets, activeIndex, overIndex)
          };

          return newAgents;
        });
      }
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Kanban Board
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Drag and drop tickets between agents
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentColumn key={agent.id} agent={agent} />
          ))}
        </div>
      </DndContext>
    </div>
  );
};

export default KanbanBoard;
