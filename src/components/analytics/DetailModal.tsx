import React from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
}

export const DetailModal: React.FC<DetailModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
}) => {
    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="sm:max-w-xl w-[90vw] p-0 flex flex-col h-full bg-background border-l shadow-2xl">
                <div className="p-6 border-b bg-muted/30">
                    <SheetHeader className="text-left space-y-1">
                        <SheetTitle className="text-2xl font-bold tracking-tight text-foreground">
                            {title}
                        </SheetTitle>
                        {description && (
                            <SheetDescription className="text-sm font-medium text-muted-foreground">
                                {description}
                            </SheetDescription>
                        )}
                    </SheetHeader>
                </div>

                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        {children}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t bg-muted/20 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                        HMS Intelligence Analytics Group
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default DetailModal;
