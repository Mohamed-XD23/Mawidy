// mock-data.js - بيانات وهمية للاختبار
export const mockWorkers = [
  {
    id: "worker1",
    name: "أحمد محمد",
    phone: "0123456789",
    location: "الرياض - حي النخيل",
    isAvailable: true,
    services: ["قص شعر", "حلاقة", "تشذيب لحية"],
    rating: 4.8,
    reviewsCount: 45,
    experience: "5 سنوات",
    description: "حلاق محترف متخصص في القصات العصرية والكلاسيكية",
    avatar: "AM"
  },
  {
    id: "worker2", 
    name: "محمد علي",
    phone: "0123456790",
    location: "جدة - حي الصفا",
    isAvailable: true,
    services: ["قص شعر", "صبغة", "تشذيب لحية"],
    rating: 4.6,
    reviewsCount: 32,
    experience: "3 سنوات",
    description: "خبير في الصبغات والقصات الحديثة",
    avatar: "مع"
  },
  {
    id: "worker3",
    name: "عبدالله سالم", 
    phone: "0123456791",
    location: "الدمام - حي الشاطئ",
    isAvailable: false,
    services: ["قص شعر", "حلاقة", "عناية بالشعر"],
    rating: 4.9,
    reviewsCount: 67,
    experience: "8 سنوات", 
    description: "حلاق ذو خبرة عالية في جميع أنواع القصات",
    avatar: "عس"
  },
  {
    id: "worker4",
    name: "يوسف أحمد",
    phone: "0123456792", 
    location: "الرياض - حي العليا",
    isAvailable: true,
    services: ["قص شعر", "تشذيب لحية", "ماسك للوجه"],
    rating: 4.7,
    reviewsCount: 28,
    experience: "4 سنوات",
    description: "متخصص في العناية الشاملة والقصات العصرية",
    avatar: "يأ"
  },
  {
    id: "worker5",
    name: "خالد عبدالرحمن",
    phone: "0123456793",
    location: "مكة - حي العزيزية", 
    isAvailable: true,
    services: ["قص شعر", "حلاقة", "تدليك فروة الرأس"],
    rating: 4.5,
    reviewsCount: 19,
    experience: "2 سنة",
    description: "حلاق شاب ومبدع في القصات الحديثة",
    avatar: "خع"
  },
  {
    id: "worker6",
    name: "سعد الغامدي",
    phone: "0123456794",
    location: "الطائف - حي الشهداء",
    isAvailable: true, 
    services: ["قص شعر", "صبغة", "تشذيب لحية", "عناية بالشعر"],
    rating: 4.8,
    reviewsCount: 53,
    experience: "6 سنوات",
    description: "خبير في جميع خدمات الحلاقة والعناية",
    avatar: "سغ"
  }
];

export const mockReviews = [
  {
    id: "review1",
    workerId: "worker1", 
    userId: "user1",
    userName: "عبدالله محمد",
    rating: 5,
    comment: "خدمة ممتازة وقصة رائعة، أنصح بشدة!",
    createdAt: new Date(2024, 0, 15)
  },
  {
    id: "review2",
    workerId: "worker1",
    userId: "user2", 
    userName: "فهد السعيد",
    rating: 4,
    comment: "حلاق محترف ونظيف، سأعود مرة أخرى",
    createdAt: new Date(2024, 0, 10)
  },
  {
    id: "review3",
    workerId: "worker2",
    userId: "user3",
    userName: "أحمد الزهراني", 
    rating: 5,
    comment: "أفضل صبغة حصلت عليها، شكراً لك!",
    createdAt: new Date(2024, 0, 8)
  },
  {
    id: "review4", 
    workerId: "worker3",
    userId: "user4",
    userName: "محمد العتيبي",
    rating: 5,
    comment: "خبرة عالية ونتيجة مذهلة، الأفضل في المنطقة",
    createdAt: new Date(2024, 0, 5)
  },
  {
    id: "review5",
    workerId: "worker4",
    userId: "user5",
    userName: "سالم القحطاني",
    rating: 4,
    comment: "خدمة جيدة وسعر مناسب",
    createdAt: new Date(2024, 0, 3)
  }
];

// دالة لحساب التقييم من المراجعات الوهمية
export function calculateMockRating(workerId) {
  const workerReviews = mockReviews.filter(review => review.workerId === workerId);
  if (workerReviews.length === 0) return 0;
  
  const totalRating = workerReviews.reduce((sum, review) => sum + review.rating, 0);
  return (totalRating / workerReviews.length).toFixed(1);
}

// دالة للحصول على مراجعات حلاق معين
export function getMockReviews(workerId) {
  return mockReviews.filter(review => review.workerId === workerId);
}