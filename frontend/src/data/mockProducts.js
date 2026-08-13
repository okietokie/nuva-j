export const mockProducts = [
  {
    _id: "nuva-ring-1",
    name: "Celeste Ring",
    description: "A delicate ring with a clean silhouette and a soft polished finish.",
    slug: "celeste-diamond-ring",
    categoryId: "rings",
    categoryName: "Rings",
    price: 280,
    salePrice: 240,
    currency: "INR",
    stock: 7,
    lowStockLimit: 3,
    images: [
      {
        url: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca3?auto=format&fit=crop&w=900&q=80",
        key: "",
        isPrimary: true,
        alt: "Celeste Diamond Ring"
      }
    ],
    sku: "NUVA-RING-001",
    material: "Gold tone",
    color: "Warm Gold",
    size: "Adjustable",
    weight: "8g",
    tags: ["diamond", "occasion", "gift"],
    status: "active",
    visibility: "visible",
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: false
  },
  {
    _id: "nuva-necklace-1",
    name: "Solene Pendant Necklace",
    description: "A pendant necklace with a sculpted silhouette and a softly reflective finish.",
    slug: "solene-pendant-necklace",
    categoryId: "necklaces",
    categoryName: "Necklaces",
    price: 340,
    salePrice: 299,
    currency: "INR",
    stock: 12,
    lowStockLimit: 4,
    images: [
      {
        url: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=80",
        key: "",
        isPrimary: true,
        alt: "Solene Pendant Necklace"
      }
    ],
    sku: "NUVA-NECK-001",
    material: "Metal tone",
    color: "Champagne Gold",
    size: "18 inches",
    weight: "12g",
    tags: ["layering", "pendant", "minimal"],
    status: "active",
    visibility: "visible",
    isFeatured: true,
    isBestSeller: false,
    isNewArrival: true
  },
  {
    _id: "nuva-earrings-1",
    name: "Auric Drop Earrings",
    description: "Drop earrings designed for graceful movement and a modern look.",
    slug: "auric-drop-earrings",
    categoryId: "earrings",
    categoryName: "Earrings",
    price: 220,
    salePrice: null,
    currency: "INR",
    stock: 2,
    lowStockLimit: 3,
    images: [
      {
        url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80",
        key: "",
        isPrimary: true,
        alt: "Auric Drop Earrings"
      }
    ],
    sku: "NUVA-EARR-001",
    material: "Gold tone",
    color: "Soft Gold",
    size: "Medium",
    weight: "10g",
    tags: ["drop", "minimal", "gold"],
    status: "active",
    visibility: "visible",
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: true
  },
  {
    _id: "nuva-bracelet-1",
    name: "Lune Chain Bracelet",
    description: "A bracelet with balanced links, subtle shine, and an easy layered feel.",
    slug: "lune-chain-bracelet",
    categoryId: "bracelets",
    categoryName: "Bracelets",
    price: 195,
    salePrice: 175,
    currency: "INR",
    stock: 9,
    lowStockLimit: 3,
    images: [
      {
        url: "https://images.unsplash.com/photo-1620656798579-1984d77f3b5d?auto=format&fit=crop&w=900&q=80",
        key: "",
        isPrimary: true,
        alt: "Lune Chain Bracelet"
      }
    ],
    sku: "NUVA-BRAC-001",
    material: "Silver tone",
    color: "Moonlight Silver",
    size: "Small to medium",
    weight: "9g",
    tags: ["bracelet", "silver", "gift"],
    status: "draft",
    visibility: "hidden",
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: false
  }
];

export const mockOrders = [
  {
    _id: "order-1001",
    createdAt: "2026-04-15T10:30:00.000Z",
    totalAmount: 560,
    paymentStatus: "paid",
    orderStatus: "processing",
    address: {
      fullName: "Ava Noor",
      line1: "Palm Residences 18",
      city: "Dubai",
      country: "UAE"
    },
    items: [
      {
        productId: "nuva-ring-1",
        name: "Celeste Diamond Ring",
        price: 280,
        quantity: 2,
        image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca3?auto=format&fit=crop&w=900&q=80"
      }
    ]
  }
];
