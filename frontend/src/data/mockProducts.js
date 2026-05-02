export const mockProducts = [
  {
    _id: "nuva-ring-1",
    name: "Celeste Diamond Ring",
    description: "A delicate gold ring with a radiant center stone crafted for timeless evenings.",
    category: "Rings",
    price: 280,
    stock: 7,
    images: [
      "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca3?auto=format&fit=crop&w=900&q=80"
    ],
    material: "18K Gold",
    color: "Warm Gold",
    isFeatured: true
  },
  {
    _id: "nuva-necklace-1",
    name: "Solene Pendant Necklace",
    description: "A fine pendant necklace with a sculpted silhouette and a soft reflective finish.",
    category: "Necklaces",
    price: 340,
    stock: 12,
    images: [
      "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=80"
    ],
    material: "Gold Vermeil",
    color: "Champagne Gold",
    isFeatured: true
  },
  {
    _id: "nuva-earrings-1",
    name: "Auric Drop Earrings",
    description: "Elegant drop earrings designed for graceful movement and a premium modern look.",
    category: "Earrings",
    price: 220,
    stock: 18,
    images: [
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80"
    ],
    material: "14K Gold",
    color: "Soft Gold",
    isFeatured: false
  },
  {
    _id: "nuva-bracelet-1",
    name: "Lune Chain Bracelet",
    description: "A refined bracelet with balanced links, subtle shine, and understated luxury.",
    category: "Bracelets",
    price: 195,
    stock: 9,
    images: [
      "https://images.unsplash.com/photo-1620656798579-1984d77f3b5d?auto=format&fit=crop&w=900&q=80"
    ],
    material: "Sterling Silver",
    color: "Moonlight Silver",
    isFeatured: false
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
