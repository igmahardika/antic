# Photo Integration Guide

## 📸 **Cara Kerja Sistem Foto Agent**

### 🎯 **Overview**
Sistem foto agent terintegrasi penuh dengan Agent Analytics. Ketika foto diupload melalui Photo Management, foto tersebut akan otomatis muncul di Agent Analytics.

### 🔄 **Alur Kerja Lengkap**

#### **1. Upload Foto (Photo Management)**
```
User Upload → PhotoUpload Component → useAgentPhotos Hook → File Storage
```

#### **2. Display Foto (Agent Analytics)**
```
Agent Analytics → PhotoDisplay Component → getAgentPhotoPath() → Photo Display
```

#### **3. Real-time Integration**
```
Photo Management ↔ Agent Analytics
     (Shared State)        (Real-time Updates)
```

### 🏗️ **Komponen yang Terlibat**

#### **1. Photo Management (Upload)**
- **`PhotoUpload.tsx`**: Interface upload drag & drop
- **`PhotoGrid.tsx`**: Grid display semua foto
- **`PhotoManagement.tsx`**: Main management interface
- **`useAgentPhotos.ts`**: Hook untuk state management

#### **2. Agent Analytics (Display)**
- **`PhotoDisplay.tsx`**: Komponen display foto
- **`AgentAnalytics.tsx`**: Menggunakan PhotoDisplay
- **`getAgentPhotoPath()`**: Utility untuk path foto

### 📁 **File Structure**

```
src/
├── components/
│   ├── PhotoUpload.tsx          # Upload interface
│   ├── PhotoGrid.tsx            # Grid display
│   ├── PhotoManagement.tsx      # Main management
│   ├── PhotoDisplay.tsx         # Display component
│   └── AgentData.tsx            # Tab interface
├── hooks/
│   └── useAgentPhotos.ts        # Photo state management
├── utils/
│   └── photoUtils.ts            # Photo utilities
└── public/
    └── agent-photos/             # Photo storage
        ├── Agent Name 1.png
        ├── Agent Name 2.png
        └── ...
```

### 🔧 **Technical Implementation**

#### **1. Photo Path Resolution**
```typescript
// utils/photoUtils.ts
export const getAgentPhotoPath = (agentName: string): string => {
  const normalizedName = normalizeAgentName(agentName);
  return `/agent-photos/${normalizedName}.png`;
};
```

#### **2. Photo State Management**
```typescript
// hooks/useAgentPhotos.ts
export const useAgentPhotos = (allAgents: string[]) => {
  const [photos, setPhotos] = useState<AgentPhoto[]>([]);
  
  const uploadPhotos = async (files: File[]) => {
    // Upload logic
  };
  
  const getPhotoForAgent = (agentName: string) => {
    return photos.find(photo => photo.agentName === agentName);
  };
};
```

#### **3. Photo Display Integration**
```typescript
// components/PhotoDisplay.tsx
const PhotoDisplay = ({ agentName, size = 'md' }) => {
  const photoPath = getAgentPhotoPath(agentName);
  
  return (
    <img
      src={photoPath}
      alt={agentName}
      onError={() => setImageError(true)}
      onLoad={() => setImageLoaded(true)}
    />
  );
};
```

### 🎨 **UI Integration**

#### **1. Agent Data Page (Tab Interface)**
```typescript
// AgentData.tsx
const AgentData = () => {
  const [activeTab, setActiveTab] = useState<'data' | 'photos'>('data');
  
  return (
    <PageWrapper>
      {/* Tab Navigation */}
      <div className="flex gap-4 mb-8">
        <Button variant={activeTab === 'data' ? 'default' : 'outline'}>
          <Users className="w-4 h-4" />
          <span>Agent Data</span>
        </Button>
        <Button variant={activeTab === 'photos' ? 'default' : 'outline'}>
          <ImageIcon className="w-4 h-4" />
          <span>Photo Management</span>
        </Button>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'data' && <AgentDataTable />}
      {activeTab === 'photos' && <PhotoManagement allAgents={allAgentNames} />}
    </PageWrapper>
  );
};
```

#### **2. Agent Analytics Integration**
```typescript
// AgentAnalytics.tsx
const AgentAnalytics = () => {
  return (
    <div className="agent-card">
      <div className="photo-section">
        <PhotoDisplay 
          agentName={agent.agent}
          size="lg"
          className="w-full h-full"
        />
      </div>
      {/* Other agent metrics */}
    </div>
  );
};
```

### 🔄 **Data Flow**

#### **1. Upload Process**
```
1. User drags files to PhotoUpload
2. Files validated (type, size)
3. useAgentPhotos.uploadPhotos() called
4. Photos added to state
5. Files saved to public/agent-photos/
6. State updated across components
```

#### **2. Display Process**
```
1. AgentAnalytics renders agent cards
2. PhotoDisplay component used for each agent
3. getAgentPhotoPath() generates correct path
4. Image loads from public/agent-photos/
5. Fallback to initials if image fails
```

#### **3. Real-time Updates**
```
1. Photo uploaded in Photo Management
2. useAgentPhotos state updated
3. All components using photos re-render
4. Agent Analytics shows new photos immediately
```

### 📊 **Photo Status System**

#### **Status Types**
- **Active**: Photo exists and is recent (< 30 days)
- **Outdated**: Photo exists but is old (> 30 days)
- **Missing**: No photo for agent
- **Inactive**: Photo exists but marked inactive

#### **Status Indicators**
```typescript
const getPhotoStatus = (photo: AgentPhoto) => {
  if (!photo.isActive) return 'inactive';
  const daysSinceUpload = Math.floor(
    (Date.now() - photo.uploadDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceUpload > 30) return 'outdated';
  return 'active';
};
```

### 🎯 **User Experience**

#### **1. Upload Experience**
- **Drag & Drop**: Intuitive file upload
- **Validation**: Real-time file validation
- **Progress**: Upload progress indicators
- **Error Handling**: Clear error messages

#### **2. Management Experience**
- **Grid View**: Visual photo management
- **Status Tracking**: See which photos need attention
- **Actions**: Delete, replace, upload photos
- **Statistics**: Overview of photo status

#### **3. Display Experience**
- **Automatic Loading**: Photos load automatically
- **Fallback**: Graceful fallback to initials
- **Responsive**: Works on all screen sizes
- **Performance**: Optimized loading

### 🔒 **Security & Validation**

#### **File Validation**
```typescript
const validatePhotoFile = (file: File) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large' };
  }
  
  return { valid: true };
};
```

#### **Name Sanitization**
```typescript
const normalizeAgentName = (agentName: string): string => {
  return agentName
    .trim()
    .replace(/[^\w\s'-]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
};
```

### 📱 **Responsive Design**

#### **Mobile (< 768px)**
- Single column photo grid
- Stacked tab navigation
- Touch-friendly buttons

#### **Tablet (768px - 1024px)**
- Two column photo grid
- Side-by-side tab navigation
- Optimized spacing

#### **Desktop (> 1024px)**
- Three to four column photo grid
- Full feature set
- Hover interactions

### 🚀 **Performance Optimizations**

#### **1. Lazy Loading**
```typescript
const PhotoDisplay = ({ agentName }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  return (
    <img
      src={photoPath}
      onLoad={() => setImageLoaded(true)}
      className={`transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};
```

#### **2. Error Handling**
```typescript
const handleImageError = () => {
  setImageError(true);
  // Fallback to initials
};
```

#### **3. Caching**
```typescript
const useAgentPhotos = (allAgents: string[]) => {
  const [photos, setPhotos] = useState<AgentPhoto[]>([]);
  
  // Photos are cached in state
  // Only reload when allAgents changes
};
```

### 🔧 **Integration Steps**

#### **1. Setup Photo Management**
```typescript
// In AgentData.tsx
import PhotoManagement from './PhotoManagement';

const AgentData = () => {
  const [activeTab, setActiveTab] = useState<'data' | 'photos'>('data');
  
  return (
    <div>
      {activeTab === 'photos' && (
        <PhotoManagement allAgents={allAgentNames} />
      )}
    </div>
  );
};
```

#### **2. Setup Photo Display**
```typescript
// In AgentAnalytics.tsx
import PhotoDisplay from './PhotoDisplay';

const AgentAnalytics = () => {
  return (
    <div className="agent-card">
      <PhotoDisplay 
        agentName={agent.agent}
        size="lg"
      />
    </div>
  );
};
```

#### **3. Setup Photo Utilities**
```typescript
// In any component that needs photos
import { getAgentPhotoPath, getAgentInitials } from '@/utils/photoUtils';

const MyComponent = ({ agentName }) => {
  const photoPath = getAgentPhotoPath(agentName);
  const initials = getAgentInitials(agentName);
  
  return <img src={photoPath} alt={agentName} />;
};
```

### 📈 **Benefits**

#### **For Users**
- ✅ **Single Page Management**: All agent features in one place
- ✅ **Real-time Updates**: Photos appear immediately in analytics
- ✅ **Easy Management**: Simple upload/replace interface
- ✅ **Visual Feedback**: See photo status at a glance

#### **For Developers**
- ✅ **Modular Components**: Reusable photo components
- ✅ **Type Safety**: Full TypeScript support
- ✅ **Error Handling**: Robust error management
- ✅ **Performance**: Optimized loading and caching

### 🎯 **Ready to Use!**

Sistem foto agent sudah terintegrasi penuh! Ketika foto diupload melalui Photo Management, foto tersebut akan otomatis muncul di Agent Analytics dengan:

- ✅ **Automatic Loading**: Foto load otomatis
- ✅ **Fallback Support**: Graceful fallback ke initials
- ✅ **Real-time Updates**: Update langsung di semua komponen
- ✅ **Error Handling**: Robust error management
- ✅ **Performance**: Optimized loading

**Sistem siap digunakan! 🚀**
