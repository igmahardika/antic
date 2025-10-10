import React from "react";

interface ModalProps {
	open: boolean;
	onClose: () => void;
	children: React.ReactNode;
	title?: string;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, children, title }) => {
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
			<div className="bg-card text-card-foreground  rounded-2xl shadow-xl max-w-2xl w-full p-6 relative animate-fade-in">
				<button
					className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xl font-bold"
					onClick={onClose}
					aria-label="Close"
				>
					×
				</button>
				{title && (
					<div className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">
						{title}
					</div>
				)}
				<div className="max-h-[70vh] overflow-y-auto pr-2">{children}</div>
			</div>
		</div>
	);
};

export default Modal;
