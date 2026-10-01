/** Place names and common words that must never be blocked. ʻokina is U+02BB. */
export const HAWAIIAN_NAMES: string[] = [
  // Oʻahu
  'Honolulu', 'Waikīkī', 'Kailua', 'Kāneʻohe', 'Hauʻula', 'Lāʻie', 'Kahuku', 'Waialua', 'Haleʻiwa', 'Mokulēʻia',
  'Waiʻanae', 'Mākaha', 'Nānākuli', 'Kapolei', 'ʻEwa Beach', 'Waipahu', 'Pearl City', 'ʻAiea', 'Hālawa', 'Kalihi',
  'Nuʻuanu', 'Mānoa', 'Pālolo', 'Kaimukī', 'Kāhala', 'Hawaiʻi Kai', 'Waimānalo', 'Makapuʻu', 'Lanikai', 'Kaʻaʻawa',
  'Punaluʻu', 'Pūpūkea', 'Wahiawā', 'Mililani', 'Waipiʻo', 'Kunia', 'Mākua', 'Kaʻena', 'Mokolīʻi', 'Heʻeia',
  'Kāneʻohe Bay', 'Diamond Head', 'Lēʻahi', 'Pālehua', 'Pākī', 'Kapiʻolani', 'Ala Moana', 'Kakaʻako', 'Moʻiliʻili', 'Kewalo',
  // Hawaiʻi Island
  'Hilo', 'Kona', 'Kailua-Kona', 'Keauhou', 'Hōlualoa', 'Kealakekua', 'Captain Cook', 'Hōnaunau', 'Miloliʻi', 'Ocean View',
  'Nāʻālehu', 'Pāhala', 'Punaluʻu Beach', 'Volcano', 'Kīlauea', 'Mauna Loa', 'Mauna Kea', 'Pāhoa', 'Kalapana', 'Kapoho',
  'Keaʻau', 'Mountain View', 'Kurtistown', 'Honomū', 'Laupāhoehoe', 'Pāpaʻaloa', 'Honokaʻa', 'Waipiʻo Valley', 'Waimea', 'Kamuela',
  'Kawaihae', 'Puakō', 'Hāpuna', 'Waikoloa', 'Kohala', 'Hāwī', 'Kapaʻau', 'Pololū', 'Hualālai', 'Puna',
  'Hāmākua', 'Kaʻū', 'Kaloko', 'Honokōhau', 'Kīholo', 'Kiholo Bay', 'Kehena', 'Pohoiki', 'Ahalanui', 'Kumukahi',
  // Maui
  'Kahului', 'Wailuku', 'Kīhei', 'Wailea', 'Mākena', 'Lāhainā', 'Kāʻanapali', 'Nāpili', 'Kapalua', 'Honokōwai',
  'Pāʻia', 'Haʻikū', 'Makawao', 'Pukalani', 'Kula', 'Keōkea', 'ʻUlupalakua', 'Hāna', 'Kīpahulu', 'Kaupō',
  'Haleakalā', 'ʻĪao', 'Kahakuloa', 'Waiheʻe', 'Olowalu', 'Māʻalaea', 'Hoʻokipa', 'Hāmoa', 'Waiʻānapanapa', 'Keʻanae',
  'Wailua', 'Nāhiku', 'Puʻunēnē', 'Spreckelsville', 'Kanahā', 'Kaupakalua', 'Honomanū', 'Kahikinui', 'Kanaio', 'Keoneʻōʻio',
  // Kauaʻi
  'Līhuʻe', 'Kapaʻa', 'Wailua Kauaʻi', 'Anahola', 'Kīlauea Kauaʻi', 'Princeville', 'Hanalei', 'Hāʻena', 'Wainiha', 'Kalalau',
  'Nā Pali', 'Kōkeʻe', 'Waimea Canyon', 'Waimea Kauaʻi', 'Kekaha', 'Polihale', 'Hanapēpē', 'ʻEleʻele', 'Kalāheo', 'Lāwaʻi',
  'Kōloa', 'Poʻipū', 'Puhi', 'Nāwiliwili', 'Hulēʻia', 'Kīpū', 'Moloaʻa', 'Kealia', 'Kapahi', 'Mānā',
  // Molokaʻi and Lānaʻi
  'Kaunakakai', 'Kualapuʻu', 'Hoʻolehua', 'Maunaloa', 'Kalaupapa', 'Kalawao', 'Hālawa Valley', 'Pukoʻo', 'Kamalō', 'Kawela',
  'Lānaʻi City', 'Mānele', 'Hulopoʻe', 'Keōmoku', 'Kaumālapaʻu', 'Pālāwai', 'Kōʻele', 'Shipwreck Beach', 'Polihua', 'Kaiolohia',
  // Words and names
  'Aloha', 'Mahalo', 'ʻOhana', 'Keiki', 'Kupuna', 'Kāne', 'Wahine', 'Kai', 'Mauka', 'Makai',
  'Pono', 'Mana', 'Hula', 'Kuleana', 'Mālama', 'ʻĀina', 'Lei', 'Honu', 'Nēnē', 'Pueo',
  'ʻIo', 'Kōlea', 'Manō', 'Heʻe', 'Ulua', 'Papio', 'Ahi', 'Ono', 'Mahimahi', 'Opakapaka',
  'Kalo', 'Poi', 'Laulau', 'Lomi', 'Haupia', 'ʻUlu', 'Niu', 'Kukui', 'ʻŌhiʻa', 'Lehua',
  'ʻIlima', 'Naupaka', 'Pīkake', 'Maile', 'Hau', 'Koa', 'Hala', 'Kōkua Kai', 'Lāʻau', 'Limu',
  'Kaʻiulani', 'Kalākaua', 'Liliʻuokalani', 'Kamehameha', 'Kūhiō', 'Keōpūolani', 'Kaʻahumanu', 'Pauahi', 'Emma', 'Lunalilo',
  'Kaipo', 'Keanu', 'Leilani', 'Noelani', 'Kimo', 'Malia', 'Kekoa', 'Ikaika', 'Nainoa', 'Moana',
  'Hōkūleʻa', 'Hōkū', 'Mahina', 'Lani', 'Uhane', 'Makani', 'Anuenue', 'Wai', 'Puʻu', 'Pali',
  'Moku', 'Ahupuaʻa', 'Loko iʻa', 'Hale', 'Heiau', 'Kahu', 'Kumu', 'Haumāna', 'Hālau', 'Mele',
  'Oli', 'Pahu', 'ʻUkulele', 'Kīhōʻalu', 'Paniolo', 'Lūʻau', 'Hoʻolauleʻa', 'Hui', 'Kōkua', 'Laulima',
  'Imua', 'Holomua', 'Kūpaʻa', 'Hoʻomau', 'Kuʻu', 'Nani', 'Maikaʻi', 'Hauʻoli', 'Kapu', 'Noa',
];
