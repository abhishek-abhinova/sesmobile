export interface ContactInfo {
  businessName: string;
  whatsappNumber: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  gstin: string;
}

export interface NavCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  children: Array<{ id: string; name: string; slug: string }>;
}

export interface ViewerSummary {
  name: string;
  role: string;
  isAdmin: boolean;
  isEditor: boolean;
  isRetailer: boolean;
  isApprovedRetailer: boolean;
  canSeeRetailerPricing: boolean;
  businessName: string | null;
}
