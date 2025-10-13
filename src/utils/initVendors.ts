import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const initializeDefaultVendors = async () => {
  try {
    // Check if vendors already exist
    const existingVendors = await db.vendors.toArray();
    
    if (existingVendors.length > 0) {
      logger.info("✅ Default vendors already exist:", existingVendors.length);
      return existingVendors;
    }

    // Create default vendors
    const defaultVendors = [
      {
        name: "Waneda",
        description: "Waneda Technical Support",
        contactPerson: "Waneda Team",
        email: "waneda@example.com",
        phone: "08123456789",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Lintas Fiber",
        description: "Lintas Fiber Technical Support",
        contactPerson: "Lintas Team",
        email: "lintas@example.com",
        phone: "08123456790",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Fiber Optic",
        description: "Fiber Optic Technical Support",
        contactPerson: "Fiber Team",
        email: "fiber@example.com",
        phone: "08123456791",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.vendors.bulkAdd(defaultVendors);
    logger.info("✅ Default vendors created successfully:", defaultVendors.length);
    
    return defaultVendors;
  } catch (error) {
    logger.error("❌ Failed to initialize default vendors:", error);
    throw error;
  }
};

// Auto-initialize when this module is imported
if (typeof window !== 'undefined') {
  initializeDefaultVendors().catch(console.error);
}

