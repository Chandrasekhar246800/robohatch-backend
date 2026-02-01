import { PrismaClient, users_role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin credentials from environment or defaults
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@robohatch.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: users_role.ADMIN,
      },
    });

    console.log('✅ Admin user created:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   ID: ${admin.id}`);
    console.log('\n⚠️  Default password: Admin@123456');
    console.log('   Please change this in production!\n');
  } else {
    console.log('⚠️  Admin user already exists');
  }

  // Check if products already exist
  const productCount = await prisma.product.count();
  
  if (productCount > 0) {
    console.log(`⚠️  ${productCount} products already exist. Skipping product seed.`);
    return;
  }

  console.log('🎨 Seeding products...');

  // Keychains (20 products)
  const keychains = [
    { name: 'Custom Logo Keychain – Round', description: 'Upload your company logo and get a premium round keychain.', basePrice: 299 },
    { name: 'Custom Logo Keychain – Square', description: 'Square logo keychain for branding and promotions.', basePrice: 299 },
    { name: 'Photo Keychain – Heart Shape', description: 'Upload your photo and convert it into a heart-shaped keychain.', basePrice: 349 },
    { name: 'Photo Keychain – Rectangle', description: 'Classic rectangle photo keychain with smooth finish.', basePrice: 299 },
    { name: 'Designer Abstract Keychain', description: 'Modern abstract designer keychain.', basePrice: 249 },
    { name: 'Designer Minimal Keychain', description: 'Minimalist design for everyday use.', basePrice: 249 },
    { name: 'Dog Paw Keychain', description: 'Cute dog paw themed keychain.', basePrice: 199 },
    { name: 'Cat Silhouette Keychain', description: 'Elegant cat silhouette keychain.', basePrice: 199 },
    { name: 'BMW Style Car Keychain', description: 'Premium car brand inspired keychain.', basePrice: 349 },
    { name: 'Audi Style Car Keychain', description: 'Sleek car brand inspired keychain.', basePrice: 349 },
    { name: 'Letter A Keychain', description: 'Alphabet letter A keychain.', basePrice: 199 },
    { name: 'Letter B Keychain', description: 'Alphabet letter B keychain.', basePrice: 199 },
    { name: 'Letter C Keychain', description: 'Alphabet letter C keychain.', basePrice: 199 },
    { name: 'Cricket Bat & Ball Keychain', description: 'Perfect keychain for cricket lovers.', basePrice: 249 },
    { name: 'Football Keychain', description: 'Football-themed sporty keychain.', basePrice: 249 },
    { name: 'Bike Number Plate Keychain', description: 'Customize with your bike number.', basePrice: 299 },
    { name: 'Couple Initials Keychain', description: 'Heart-shaped initials keychain.', basePrice: 349 },
    { name: 'QR Code Keychain', description: 'Custom QR code keychain.', basePrice: 399 },
    { name: 'Animal Face Keychain – Lion', description: 'Lion face themed keychain.', basePrice: 249 },
    { name: 'Animal Face Keychain – Tiger', description: 'Tiger face themed keychain.', basePrice: 249 },
  ];

  // Anime models (20 products)
  const anime = [
    { name: 'Naruto Uzumaki Figure', description: 'Naruto action pose collectible.', basePrice: 1299 },
    { name: 'Sasuke Uchiha Figure', description: 'Sasuke with Sharingan stance.', basePrice: 1299 },
    { name: 'Gojo Satoru Figure', description: 'Gojo Satoru premium anime figure.', basePrice: 1499 },
    { name: 'Yuji Itadori Figure', description: 'Yuji action pose model.', basePrice: 1199 },
    { name: 'Tanjiro Kamado Figure', description: 'Demon Slayer Tanjiro model.', basePrice: 1299 },
    { name: 'Nezuko Kamado Figure', description: 'Nezuko cute anime figure.', basePrice: 1299 },
    { name: 'Monkey D Luffy Figure', description: 'One Piece Luffy pose.', basePrice: 1499 },
    { name: 'Roronoa Zoro Figure', description: 'Zoro sword stance.', basePrice: 1599 },
    { name: 'Blue Lock Isagi Figure', description: 'Isagi Yoichi football pose.', basePrice: 1199 },
    { name: 'Blue Lock Rin Figure', description: 'Rin Itoshi dynamic pose.', basePrice: 1199 },
    { name: 'Solo Leveling Sung Jin-Woo', description: 'Sung Jin-Woo shadow monarch pose.', basePrice: 1699 },
    { name: 'Shadow Soldier Figure', description: 'Solo Leveling shadow soldier.', basePrice: 1399 },
    { name: 'Naruto Hokage Bust', description: 'Hokage Naruto bust model.', basePrice: 999 },
    { name: 'Gojo Masked Version', description: 'Gojo masked variant.', basePrice: 1599 },
    { name: 'Tanjiro Sword Pose', description: 'Tanjiro with katana.', basePrice: 1499 },
    { name: 'Luffy Gear 5 Bust', description: 'Gear 5 collectible bust.', basePrice: 1799 },
    { name: 'Zoro Three Sword Style', description: 'Iconic Zoro pose.', basePrice: 1799 },
    { name: 'Nezuko Chibi Figure', description: 'Cute chibi Nezuko.', basePrice: 999 },
    { name: 'Yuji Curse Energy Pose', description: 'Yuji special pose.', basePrice: 1399 },
    { name: 'Sung Jin-Woo Bust', description: 'Solo Leveling bust figure.', basePrice: 1499 },
  ];

  // Devotional idols (20 products)
  const devotional = [
    { name: 'Ganesha Idol – Small', description: 'Small Ganesha idol for home.', basePrice: 999 },
    { name: 'Ganesha Idol – Medium', description: 'Medium size Ganesha idol.', basePrice: 1499 },
    { name: 'Buddha Statue – Meditation', description: 'Peaceful Buddha meditation statue.', basePrice: 1299 },
    { name: 'Buddha Head Decor', description: 'Buddha head spiritual decor.', basePrice: 1199 },
    { name: 'Lakshmi Idol – Seated', description: 'Goddess Lakshmi seated idol.', basePrice: 1499 },
    { name: 'Lakshmi Idol – Standing', description: 'Standing Lakshmi idol.', basePrice: 1599 },
    { name: 'Hanuman Idol – Veer', description: 'Powerful Hanuman idol.', basePrice: 1599 },
    { name: 'Hanuman Bust', description: 'Compact Hanuman bust.', basePrice: 999 },
    { name: 'Krishna Idol – Flute', description: 'Krishna playing flute.', basePrice: 1499 },
    { name: 'Krishna Idol – Child', description: 'Bal Krishna idol.', basePrice: 1399 },
    { name: 'Shiva Idol – Meditation', description: 'Lord Shiva meditation pose.', basePrice: 1699 },
    { name: 'Shiva Adiyogi Bust', description: 'Adiyogi inspired bust.', basePrice: 1799 },
    { name: 'Saraswathi Idol – Seated', description: 'Goddess Saraswathi idol.', basePrice: 1499 },
    { name: 'Saraswathi Idol – Veena', description: 'Saraswathi with veena.', basePrice: 1599 },
    { name: 'Durga Maa Idol – Small', description: 'Durga Maa idol.', basePrice: 1599 },
    { name: 'Durga Maa Idol – Lion Pose', description: 'Durga riding lion.', basePrice: 1799 },
    { name: 'Temple Bell Decor', description: 'Temple bell home decor.', basePrice: 999 },
    { name: 'Om Symbol Wall Decor', description: 'Om symbol spiritual decor.', basePrice: 799 },
    { name: 'Trishul Stand', description: 'Trishul stand decor.', basePrice: 899 },
    { name: 'Nandi Idol', description: 'Nandi idol for Shiva devotees.', basePrice: 1199 },
  ];

  // Home decor (20 products)
  const homeDecor = [
    { name: '3D Wall Art – Mandala', description: 'Modern mandala wall art.', basePrice: 1299 },
    { name: 'Geometric Wall Art', description: 'Abstract geometric wall decor.', basePrice: 1199 },
    { name: 'Photo Frame – Minimal', description: 'Modern minimal photo frame.', basePrice: 899 },
    { name: 'Photo Frame – Dual', description: 'Dual photo frame design.', basePrice: 999 },
    { name: 'Hanging Plant Holder', description: 'Wall hanging plant holder.', basePrice: 799 },
    { name: 'Tabletop Plant Pot', description: 'Minimal tabletop planter.', basePrice: 699 },
    { name: 'Modern Clock Design', description: '3D printed wall clock.', basePrice: 1499 },
    { name: 'Desk Clock Minimal', description: 'Minimal desk clock.', basePrice: 1299 },
    { name: 'Candle Holder – Spiral', description: 'Spiral candle holder.', basePrice: 699 },
    { name: 'Candle Holder – Lotus', description: 'Lotus shaped candle holder.', basePrice: 799 },
    { name: 'Bookend – Abstract', description: 'Abstract bookend pair.', basePrice: 999 },
    { name: 'Bookend – Geometric', description: 'Geometric style bookend.', basePrice: 999 },
    { name: 'Name Stand Decor', description: 'Personalized name stand.', basePrice: 899 },
    { name: 'Quote Frame Decor', description: 'Custom quote wall decor.', basePrice: 999 },
    { name: 'Tabletop Organizer', description: 'Modern desk organizer.', basePrice: 799 },
    { name: 'Key Holder Wall Mount', description: 'Wall mounted key holder.', basePrice: 899 },
    { name: 'Modern Vase – Tall', description: 'Tall decorative vase.', basePrice: 1199 },
    { name: 'Modern Vase – Short', description: 'Short decorative vase.', basePrice: 999 },
    { name: 'Floating Shelf Decor', description: 'Decorative floating shelf.', basePrice: 1499 },
    { name: 'Wall Mounted Planter', description: 'Wall planter decor.', basePrice: 899 },
  ];

  // Insert all products
  const allProducts = [...keychains, ...anime, ...devotional, ...homeDecor];

  for (const product of allProducts) {
    await prisma.product.create({
      data: {
        name: product.name,
        description: product.description,
        basePrice: product.basePrice,
        isActive: true,
      },
    });
  }

  console.log(`✅ Seeded ${allProducts.length} products`);
  console.log(`   - Keychains: ${keychains.length}`);
  console.log(`   - Anime figures: ${anime.length}`);
  console.log(`   - Devotional idols: ${devotional.length}`);
  console.log(`   - Home decor: ${homeDecor.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
