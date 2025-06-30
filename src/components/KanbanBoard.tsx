import React, { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import useDataStore from '@/store/dataStore';
import { ITicket } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type TicketStatus = 'Open' | 'In Progress' | 'Closed';

const columnTitles: Record<TicketStatus, string> = {
    'Open': 'Open',
    'In Progress': 'In Progress',
    'Closed': 'Closed',
};

const KanbanBoard = () => {
    const { allTickets, updateTicketStatus } = useDataStore();
    const [columns, setColumns] = useState<Record<TicketStatus, ITicket[]>>({
        'Open': [],
        'In Progress': [],
        'Closed': [],
    });

    useEffect(() => {
        if (allTickets) {
            const newColumns: Record<TicketStatus, ITicket[]> = {
                'Open': [],
                'In Progress': [],
                'Closed': [],
            };
            allTickets.forEach(ticket => {
                const status = ticket.status as TicketStatus || 'Open';
                if (newColumns[status]) {
                    newColumns[status].push(ticket);
                }
            });
            setColumns(newColumns);
        }
    }, [allTickets]);

    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;

        const sourceColId = source.droppableId as TicketStatus;
        const destColId = destination.droppableId as TicketStatus;
        const sourceCol = columns[sourceColId];
        const destCol = columns[destColId];
        
        const sourceItems = [...sourceCol];
        const destItems = [...destCol];
        const [removed] = sourceItems.splice(source.index, 1);

        if (sourceColId === destColId) {
            sourceItems.splice(destination.index, 0, removed);
            setColumns({ ...columns, [sourceColId]: sourceItems });
        } else {
            destItems.splice(destination.index, 0, removed);
            setColumns({
                ...columns,
                [sourceColId]: sourceItems,
                [destColId]: destItems,
            });
            updateTicketStatus(draggableId, destColId);
        }
    };
    
    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold">Ticket Kanban Board</h1>
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {Object.entries(columns).map(([columnId, tickets]) => (
                        <Droppable key={columnId} droppableId={columnId}>
                            {(provided, snapshot) => (
                                <Card className={`flex flex-col ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-zinc-800' : 'bg-gray-50 dark:bg-zinc-900'}`}>
                                    <CardHeader>
                                        <CardTitle className="flex justify-between items-center">
                                            {columnTitles[columnId as TicketStatus]}
                                            <Badge variant="secondary">{tickets.length}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent ref={provided.innerRef} {...provided.droppableProps} className="flex-grow p-2 min-h-[500px]">
                                        {tickets.map((ticket, index) => (
                                            <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`p-3 mb-3 rounded-lg shadow-sm border ${snapshot.isDragging ? 'bg-white shadow-lg' : 'bg-white/80'}`}
                                                    >
                                                        <p className="font-semibold text-sm">{ticket.category}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">{ticket.name}</p>
                                                        <p className="text-xs text-muted-foreground">ID: {ticket.id.substring(0,8)}...</p>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </CardContent>
                                </Card>
                            )}
                        </Droppable>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
};

export default KanbanBoard; 