// Icons
import HomeIcon from "@mui/icons-material/Home";
import TableChartIcon from "@mui/icons-material/TableChart";
import GroupIcon from "@mui/icons-material/Group";
import BarChartIcon from "@mui/icons-material/BarChart";
import PersonCheckIcon from "@mui/icons-material/HowToReg";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonIcon from "@mui/icons-material/Person";
import WarningIcon from "@mui/icons-material/Warning";
import ScienceIcon from "@mui/icons-material/Science";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import StorageIcon from "@mui/icons-material/Storage";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import BusinessIcon from "@mui/icons-material/Business";

export const menuConfig = [
    {
        name: "Dashboard",
        path: "/",
        icon: <HomeIcon sx={{ fontSize: 16 }} />,
    },
    {
        name: "Ticket",
        path: "/ticket",
        icon: <ConfirmationNumberIcon sx={{ fontSize: 16 }} />,
        children: [
            {
                name: "Ticket Data",
                path: "/ticket/grid-view",
                icon: <TableChartIcon sx={{ fontSize: 16 }} />,
            },
            {
                name: "Customer Analytics",
                path: "/ticket/kanban-board",
                icon: <GroupIcon sx={{ fontSize: 16 }} />,
            },
            {
                name: "Ticket Analytics",
                path: "/ticket/ticket-analytics",
                icon: <BarChartIcon sx={{ fontSize: 16 }} />,
            },
            {
                name: "Agent Analytics",
                path: "/ticket/agent-analytics",
                icon: <PersonCheckIcon sx={{ fontSize: 16 }} />,
            },
            {
                name: "Upload Data",
                path: "/ticket/upload",
                icon: <CloudUploadIcon sx={{ fontSize: 16 }} />,
            },
        ],
    },
    {
        name: "Incident",
        path: "/incident",
        icon: <WarningIcon sx={{ fontSize: 16 }} />,
        children: [
            {
                name: "Incident Data",
                path: "/incident/data",
                icon: <TableChartIcon sx={{ fontSize: 16 }} />,
            },
            {
                name: "Incident Analytics",
                path: "/incident/analytics",
                icon: <BarChartIcon sx={{ fontSize: 16 }} />,
            },
            {
                name: "Technical Support Analytics",
                path: "/incident/ts-analytics",
                icon: <ScienceIcon sx={{ fontSize: 16 }} />,
            },
            {
                name: "Site Analytics",
                path: "/incident/site-analytics",
                icon: <GroupIcon sx={{ fontSize: 16 }} />,
            },
        ],
    },
    {
        name: "Master Data",
        path: "/masterdata",
        icon: <StorageIcon sx={{ fontSize: 16 }} />,
        children: [
            {
                name: "Agent Data",
                path: "/masterdata/data-agent",
                icon: <PersonIcon sx={{ fontSize: 16 }} />,
            },
            {
                name: "Customer Data",
                path: "/masterdata/data-customer",
                icon: <GroupIcon sx={{ fontSize: 16 }} />,
            },
            {
                name: "Vendor Data",
                path: "/vendor-data",
                icon: <BusinessIcon sx={{ fontSize: 16 }} />,
            },
        ],
    },
    {
        name: "Documentation",
        path: "/documentation",
        icon: <MenuBookIcon sx={{ fontSize: 16 }} />,
        children: [
            {
                name: "Formulas",
                path: "/documentation/admin-rumus",
                icon: <ScienceIcon sx={{ fontSize: 16 }} />,
            },
        ],
    },
    {
        name: "Admin Panel",
        path: "/admin",
        icon: <AdminPanelSettingsIcon sx={{ fontSize: 16 }} />,
    },
];

// Helper to flatten menu for easy path lookup
export const flattenMenu = (menus: any[]) => {
    let flat: any[] = [];
    menus.forEach(menu => {
        flat.push(menu);
        if (menu.children) {
            flat = flat.concat(flattenMenu(menu.children));
        }
    });
    return flat;
};
