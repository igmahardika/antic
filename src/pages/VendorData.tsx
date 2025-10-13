import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/ui/PageHeader";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { logger } from "@/lib/logger";

// MUI Icons
import BusinessIcon from "@mui/icons-material/Business";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

interface Vendor {
	id?: number;
	name: string;
	description?: string;
	contactPerson?: string;
	email?: string;
	phone?: string;
	isActive: boolean;
	createdAt?: Date;
	updatedAt?: Date;
}

const VendorData: React.FC = () => {
	const [isLoading, setIsLoading] = useState(true);
	const [vendors, setVendors] = useState<Vendor[]>([]);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
	const [formData, setFormData] = useState<Vendor>({
		name: "",
		description: "",
		contactPerson: "",
		email: "",
		phone: "",
		isActive: true,
	});
	const [searchTerm, setSearchTerm] = useState("");
	const [filterActive, setFilterActive] = useState<boolean | null>(null);

	// Load vendors from database
	const allVendors = useLiveQuery(async () => {
		try {
			const vendorData = await db.vendors.toArray();
			logger.info("✅ VendorData: Successfully loaded", vendorData.length, "vendors from database");
			return vendorData;
		} catch (error) {
			logger.error("❌ VendorData: Failed to load vendors from database:", error);
			return [];
		}
	}, []);

	// Update vendors state when data changes
	useEffect(() => {
		if (allVendors) {
			setVendors(allVendors);
			setIsLoading(false);
		}
	}, [allVendors]);

	// Filter vendors based on search and active status
	const filteredVendors = vendors.filter((vendor) => {
		const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			vendor.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			vendor.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			vendor.email?.toLowerCase().includes(searchTerm.toLowerCase());
		
		const matchesActive = filterActive === null || vendor.isActive === filterActive;
		
		return matchesSearch && matchesActive;
	});

	// Handle form input changes
	const handleInputChange = (field: keyof Vendor, value: any) => {
		setFormData(prev => ({
			...prev,
			[field]: value
		}));
	};

	// Reset form
	const resetForm = () => {
		setFormData({
			name: "",
			description: "",
			contactPerson: "",
			email: "",
			phone: "",
			isActive: true,
		});
		setEditingVendor(null);
	};

	// Handle add/edit vendor
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!formData.name.trim()) {
			alert("Vendor name is required");
			return;
		}

		try {
			const now = new Date();
			
			if (editingVendor) {
				// Update existing vendor
				await db.vendors.update(editingVendor.id!, {
					...formData,
					updatedAt: now,
				});
				logger.info("✅ VendorData: Updated vendor:", formData.name);
			} else {
				// Add new vendor
				await db.vendors.add({
					...formData,
					createdAt: now,
					updatedAt: now,
				});
				logger.info("✅ VendorData: Added new vendor:", formData.name);
			}

			resetForm();
			setIsDialogOpen(false);
		} catch (error) {
			logger.error("❌ VendorData: Failed to save vendor:", error);
			alert("Failed to save vendor. Please try again.");
		}
	};

	// Handle edit vendor
	const handleEdit = (vendor: Vendor) => {
		setEditingVendor(vendor);
		setFormData(vendor);
		setIsDialogOpen(true);
	};

	// Handle delete vendor
	const handleDelete = async (vendor: Vendor) => {
		if (!confirm(`Are you sure you want to delete vendor "${vendor.name}"?`)) {
			return;
		}

		try {
			await db.vendors.delete(vendor.id!);
			logger.info("✅ VendorData: Deleted vendor:", vendor.name);
		} catch (error) {
			logger.error("❌ VendorData: Failed to delete vendor:", error);
			alert("Failed to delete vendor. Please try again.");
		}
	};

	// Handle toggle active status
	const handleToggleActive = async (vendor: Vendor) => {
		try {
			await db.vendors.update(vendor.id!, {
				isActive: !vendor.isActive,
				updatedAt: new Date(),
			});
			logger.info("✅ VendorData: Toggled active status for vendor:", vendor.name);
		} catch (error) {
			logger.error("❌ VendorData: Failed to toggle active status:", error);
			alert("Failed to update vendor status. Please try again.");
		}
	};

	// Handle open dialog for new vendor
	const handleAddNew = () => {
		resetForm();
		setIsDialogOpen(true);
	};

	if (isLoading) {
		return (
			<PageWrapper maxW="4xl">
				<div className="flex justify-center items-center h-64">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				</div>
			</PageWrapper>
		);
	}

	return (
		<PageWrapper maxW="4xl">
			<div className="space-y-6 lg:space-y-8">
				<PageHeader
					title="Vendor Data"
					description="Manage registered vendors for technical support analytics"
				/>

				{/* Summary Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center gap-4">
								<BusinessIcon className="w-8 h-8 text-blue-600" />
								<div>
									<p className="text-sm font-medium text-muted-foreground">Total Vendors</p>
									<p className="text-2xl font-bold">{vendors.length}</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center gap-4">
								<CheckCircleIcon className="w-8 h-8 text-green-600" />
								<div>
									<p className="text-sm font-medium text-muted-foreground">Active Vendors</p>
									<p className="text-2xl font-bold">{vendors.filter(v => v.isActive).length}</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center gap-4">
								<CancelIcon className="w-8 h-8 text-red-600" />
								<div>
									<p className="text-sm font-medium text-muted-foreground">Inactive Vendors</p>
									<p className="text-2xl font-bold">{vendors.filter(v => !v.isActive).length}</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Controls */}
				<Card>
					<CardHeader>
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<CardTitle>Vendor Management</CardTitle>
							<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
								<DialogTrigger asChild>
									<Button onClick={handleAddNew} className="flex items-center gap-2">
										<AddIcon className="w-4 h-4" />
										Add New Vendor
									</Button>
								</DialogTrigger>
								<DialogContent className="sm:max-w-[600px]">
									<DialogHeader>
										<DialogTitle>
											{editingVendor ? "Edit Vendor" : "Add New Vendor"}
										</DialogTitle>
										<DialogDescription>
											{editingVendor 
												? "Update vendor information below."
												: "Fill in the vendor information below."
											}
										</DialogDescription>
									</DialogHeader>
									<form onSubmit={handleSubmit} className="space-y-4">
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="name">Vendor Name *</Label>
												<Input
													id="name"
													value={formData.name}
													onChange={(e) => handleInputChange("name", e.target.value)}
													placeholder="Enter vendor name"
													required
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="contactPerson">Contact Person</Label>
												<Input
													id="contactPerson"
													value={formData.contactPerson}
													onChange={(e) => handleInputChange("contactPerson", e.target.value)}
													placeholder="Enter contact person name"
												/>
											</div>
										</div>
										<div className="space-y-2">
											<Label htmlFor="description">Description</Label>
											<Textarea
												id="description"
												value={formData.description}
												onChange={(e) => handleInputChange("description", e.target.value)}
												placeholder="Enter vendor description"
												rows={3}
											/>
										</div>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="email">Email</Label>
												<Input
													id="email"
													type="email"
													value={formData.email}
													onChange={(e) => handleInputChange("email", e.target.value)}
													placeholder="Enter email address"
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="phone">Phone</Label>
												<Input
													id="phone"
													value={formData.phone}
													onChange={(e) => handleInputChange("phone", e.target.value)}
													placeholder="Enter phone number"
												/>
											</div>
										</div>
										<div className="flex items-center space-x-2">
											<Switch
												id="isActive"
												checked={formData.isActive}
												onCheckedChange={(checked) => handleInputChange("isActive", checked)}
											/>
											<Label htmlFor="isActive">Active Vendor</Label>
										</div>
										<DialogFooter>
											<Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
												Cancel
											</Button>
											<Button type="submit">
												{editingVendor ? "Update Vendor" : "Add Vendor"}
											</Button>
										</DialogFooter>
									</form>
								</DialogContent>
							</Dialog>
						</div>
					</CardHeader>
					<CardContent>
						{/* Search and Filter */}
						<div className="flex flex-col sm:flex-row gap-4 mb-6">
							<div className="flex-1">
								<Input
									placeholder="Search vendors..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full"
								/>
							</div>
							<div className="flex gap-2">
								<Button
									variant={filterActive === null ? "default" : "outline"}
									onClick={() => setFilterActive(null)}
									size="sm"
								>
									All
								</Button>
								<Button
									variant={filterActive === true ? "default" : "outline"}
									onClick={() => setFilterActive(true)}
									size="sm"
								>
									Active
								</Button>
								<Button
									variant={filterActive === false ? "default" : "outline"}
									onClick={() => setFilterActive(false)}
									size="sm"
								>
									Inactive
								</Button>
							</div>
						</div>

						{/* Vendors Table */}
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Vendor Name</TableHead>
										<TableHead>Contact Person</TableHead>
										<TableHead>Email</TableHead>
										<TableHead>Phone</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredVendors.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
												No vendors found
											</TableCell>
										</TableRow>
									) : (
										filteredVendors.map((vendor) => (
											<TableRow key={vendor.id}>
												<TableCell>
													<div>
														<div className="font-medium">{vendor.name}</div>
														{vendor.description && (
															<div className="text-sm text-muted-foreground">
																{vendor.description}
															</div>
														)}
													</div>
												</TableCell>
												<TableCell>{vendor.contactPerson || "-"}</TableCell>
												<TableCell>{vendor.email || "-"}</TableCell>
												<TableCell>{vendor.phone || "-"}</TableCell>
												<TableCell>
													<Badge variant={vendor.isActive ? "default" : "secondary"}>
														{vendor.isActive ? "Active" : "Inactive"}
													</Badge>
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-2">
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleEdit(vendor)}
														>
															<EditIcon className="w-4 h-4" />
														</Button>
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleToggleActive(vendor)}
														>
															{vendor.isActive ? (
																<CancelIcon className="w-4 h-4" />
															) : (
																<CheckCircleIcon className="w-4 h-4" />
															)}
														</Button>
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleDelete(vendor)}
															className="text-red-600 hover:text-red-700"
														>
															<DeleteIcon className="w-4 h-4" />
														</Button>
													</div>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			</div>
		</PageWrapper>
	);
};

export default VendorData;

