const author = (name, profile, photoPage, image) => ({
  id: `curated-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  url: `${image}?auto=format&fit=crop&w=1800&q=88`,
  photographer: name,
  profileUrl: `${profile}?utm_source=poster_studio&utm_medium=referral`,
  unsplashUrl: `${photoPage}?utm_source=poster_studio&utm_medium=referral`,
})

export const TEMPLATE_PHOTOS = {
  concert: author('Frederick Shaw', 'https://unsplash.com/@dropfastcollective', 'https://unsplash.com/photos/a-group-of-people-that-are-on-a-stage-4-qRzyGSb98', 'https://images.unsplash.com/photo-1722506224653-bb5556e6b782'),
  product: author('Content Pixie', 'https://unsplash.com/@contentpixie', 'https://unsplash.com/photos/a-bottle-of-cologne-next-to-rocks-and-a-rock--ZaKKlJUoHE', 'https://images.unsplash.com/photo-1608571424266-edeb9bbefdec'),
  portrait: author('lhon karwan', 'https://unsplash.com/@lhonkarwanhamasalih', 'https://unsplash.com/photos/a-woman-leans-on-a-railing-posing-RVKQCTSr3zM', 'https://images.unsplash.com/photo-1680720589474-8c396f0966b7'),
  architecture: author('Kelly Sikkema', 'https://unsplash.com/@kellysikkema', 'https://unsplash.com/photos/white-concrete-building-under-blue-sky-during-daytime-0mXdghvJ61U', 'https://images.unsplash.com/photo-1622396481322-3b83d186701b'),
  coffee: author('Valentina Dominguez', 'https://unsplash.com/@valedomt', 'https://unsplash.com/photos/man-in-grey-crew-neck-t-shirt-using-black-and-grey-espresso-machine-vkyu2vlwNh0', 'https://images.unsplash.com/photo-1607539068168-21a93fbedad8'),
  winter: author('Alessio Soggetti', 'https://unsplash.com/@asoggetti', 'https://unsplash.com/photos/landscape-photography-of-snow-plain-and-mountain-xTQtznnfgqA', 'https://images.unsplash.com/photo-1523997596732-56d0ebb8eacf'),
  bakery: author('Phil Hearing', 'https://unsplash.com/@philhearing', 'https://unsplash.com/photos/assortment-of-fresh-pastries-and-croissants-on-display-iKExZ008Zh0', 'https://images.unsplash.com/photo-1767379755386-1b213fb63c07'),
  flowers: author('Jessie Daniella', 'https://unsplash.com/@jessiedaniella', 'https://unsplash.com/photos/pink-and-white-rose-bouquet-QLuleNy8LMM', 'https://images.unsplash.com/photo-1523693916903-027d144a2b7d'),
  anniversary: author('Filip Rankovic Grobgaard', 'https://unsplash.com/@filipgrobgaard', 'https://unsplash.com/photos/champagne-glasses-and-bottles-on-a-table-at-an-event-meKKwguZKUw', 'https://images.unsplash.com/photo-1768508660861-16b3b4272e6f'),
  skincare: author('andrew davies', 'https://unsplash.com/@arny231104', 'https://unsplash.com/photos/three-colorful-pump-bottles-with-a-flower-EcatBSsexsw', 'https://images.unsplash.com/photo-1771519902689-0a5c7be8efe6'),
  teacherDay: author('David Geneugelijk', 'https://unsplash.com/@davidgeneugelijk', 'https://unsplash.com/photos/a-teacher-instructs-students-in-a-classroom-CXa6E3krENE', 'https://images.unsplash.com/photo-1744809482817-9a9d4fc280af'),
  teacherMentor: author('Vitaly Gariev', 'https://unsplash.com/@silverkblack', 'https://unsplash.com/photos/teacher-interacting-with-students-in-a-classroom-setting-c6QLJhezaYs', 'https://images.unsplash.com/photo-1758270705696-ec9caffc73dd'),
  // 新增类目配图
  green: author('Sergei A', 'https://unsplash.com/@sergeia', 'https://unsplash.com/photos/green-trees-near-body-of-water-during-daytime-p0LeW8fJzOQ', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e'),
  green2: author('Tim Swaan', 'https://unsplash.com/@timswaanphotography', 'https://unsplash.com/photos/a-view-of-a-lush-green-forest-from-above-eOpewngf68w', 'https://images.unsplash.com/photo-1448375240586-882707db888b'),
  education: author('Ben Mullins', 'https://unsplash.com/@benmullins', 'https://unsplash.com/photos/a-close-up-of-a-book-with-a-pencil-on-top-of-it-je240SaI9no', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b'),
  tech: author('Marvin Meyer', 'https://unsplash.com/@marvelous', 'https://unsplash.com/photos/a-group-of-people-sitting-around-a-table-with-laptops-SYTO3xs06fU', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c'),
  finance: author('Adeolu Eletu', 'https://unsplash.com/@adeolueletu', 'https://unsplash.com/photos/a-graph-of-stock-market-data-on-a-computer-screen--UnU5oLBzUU', 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3'),
  health: author('Jared Rice', 'https://unsplash.com/@jareddrice', 'https://unsplash.com/photos/woman-in-black-sports-bra-exercising-in-the-gym-NTyBbu66_SI', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b'),
  food: author('Sara Dubler', 'https://unsplash.com/@sarakdee', 'https://unsplash.com/photos/a-bowl-of-food-with-chopsticks-and-a-bowl-of-rice-rlR4aL9cYco', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836'),
  charity: author('Larm Rmah', 'https://unsplash.com/@larm', 'https://unsplash.com/photos/group-of-people-sitting-on-the-ground-outdoors-f_F9cBUhVUA', 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b'),
  realestate: author('Tierra Mallorca', 'https://unsplash.com/@tierramallorca', 'https://unsplash.com/photos/white-and-brown-house-surrounded-by-trees-JgOeRuGD_Y4', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9'),
  auto: author('Campbell', 'https://unsplash.com/@campbell_3d', 'https://unsplash.com/photos/a-blue-sports-car-parked-on-a-road-3ZUsNJhi_Ik', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8'),
  baby: author('Tanaphong Toochinda', 'https://unsplash.com/@daen_2chinda', 'https://unsplash.com/photos/a-baby-laying-on-a-bed-with-a-towel-on-top-of-its-head-DDn9I5V1ubE', 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9'),
}

const CASE_PHOTOS = [
  'concert', 'product', 'portrait', 'architecture', 'coffee',
  'bakery', 'winter', 'flowers', 'anniversary', 'skincare',
  'teacherDay', 'teacherMentor',
  'green', 'green2', 'education', 'tech', 'finance', 'health',
  'food', 'charity', 'realestate', 'auto', 'baby',
]
const CASE_STYLES = ['concert', 'catalog', 'portrait', 'architecture', 'market', 'bakery', 'winter', 'floral', 'anniversary', 'product-launch', 'teachers-day', 'teacher-mentor',
  'winter', 'winter', 'architecture', 'portrait', 'catalog', 'market', 'bakery', 'floral', 'architecture', 'catalog', 'floral']

export function photoForTemplate(index) {
  return { ...TEMPLATE_PHOTOS[CASE_PHOTOS[index % CASE_PHOTOS.length]], templateStyle: CASE_STYLES[index % CASE_STYLES.length] }
}
