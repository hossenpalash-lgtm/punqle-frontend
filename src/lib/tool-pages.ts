// Content for the free-tool SEO pages under /tools (server-rendered, so Google reads every word).
// The captions are written by hand on purpose: mass-generated filler ranks badly and helps nobody.
// Spelling is US English (the biggest English-speaking market); owners edit lines to fit their own business.

export const SITE_ORIGIN = "https://www.punqle.com";

export type BusinessType = "cafe" | "hair_salon" | "boutique" | "restaurant" | "gym" | "ecommerce" | "other";

export interface CaptionGroup {
  title: string;
  captions: string[];
}

export interface ToolPageData {
  slug: string;
  businessType: BusinessType;
  /** Short name used in links and breadcrumbs. */
  label: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  groups: CaptionGroup[];
  /** Heading above the ready-made lines; defaults to "30 captions to copy". */
  listTitle?: string;
  listIntro?: string;
  /** Closing call-to-action; defaults to the generic "Captions are the easy part" block. */
  cta?: { title: string; body: string };
  tips: { title: string; body: string }[];
  faq: { q: string; a: string }[];
}

const PHOTO_FAQ: { q: string; a: string }[] = [
  {
    q: "Is the caption generator really free?",
    a: "Yes. You don't need an account or a credit card. To keep it fair for everyone there is a small daily limit per visitor; a free Punqle account gives you more.",
  },
  {
    q: "What happens to my photo?",
    a: "Punqle does not store it. The photo is sent once to our AI provider so it can write the captions, then it is gone from our side. Details are in our Privacy Policy.",
  },
];

export const TOOL_PAGES: Record<string, ToolPageData> = {
  "caption-generator-from-photo": {
    slug: "caption-generator-from-photo",
    businessType: "other",
    label: "Caption generator from photo",
    metaTitle: "Free Caption Generator From Photo (No Login) | Punqle",
    metaDescription:
      "Upload a photo and get 5 Instagram captions, hashtags and ad headlines written for what is actually in the picture. Free, no login needed.",
    h1: "Caption generator from photo",
    intro: [
      "Most caption generators ask you to describe your picture first. This one looks at the photo itself and writes captions about what is really in it: the foam on the latte, the color of the dress, the light through the window.",
      "Pick your type of business, add a short note if you have an offer to mention, and you get five captions in different styles, a set of hashtags and three short ad headlines you can copy straight into Instagram or Facebook.",
    ],
    groups: [],
    tips: [
      {
        title: "Use a clear, well-lit photo",
        body: "The better the photo, the more specific the captions. Natural light and one clear subject work best.",
      },
      {
        title: "Add a note when you have something to say",
        body: "A line such as \"2-for-1 on Friday\" is used exactly as you wrote it. The tool will not invent prices, hours or offers.",
      },
      {
        title: "Edit before you post",
        body: "Treat the result as a strong first draft. Swap in your own words, your shop's name and the details only you know.",
      },
      {
        title: "Check the first line",
        body: "On Instagram only the first line or two show before \"more\", so make sure the opening of your caption does the work.",
      },
    ],
    faq: [
      ...PHOTO_FAQ,
      {
        q: "Does it work for any business?",
        a: "It is tuned for small local businesses: cafes, salons, boutiques, restaurants, gyms and similar. Pick the closest type, or \"other\" for anything else.",
      },
      {
        q: "How many hashtags should I use?",
        a: "A handful of relevant ones is enough. More hashtags do not automatically mean more reach, so pick the ones that describe your photo and your business.",
      },
    ],
  },

  "coffee-shop-instagram-captions": {
    slug: "coffee-shop-instagram-captions",
    businessType: "cafe",
    label: "Coffee shops",
    metaTitle: "Coffee Shop Instagram Captions: 30 to Copy + Free Tool",
    metaDescription:
      "30 original Instagram captions for coffee shops and cafes, plus a free tool that writes captions from your own photo. No login needed.",
    h1: "Instagram captions for coffee shops",
    intro: [
      "A good cafe caption sounds like the person behind the counter: warm, a little funny, never pushy. Below are 30 you can copy and tweak, grouped by what you are trying to do with the post.",
      "Want captions written for the actual photo of your latte, pastry or window seat? Use the free tool: upload the picture and it writes five options plus hashtags.",
    ],
    groups: [
      {
        title: "Short and punchy",
        captions: [
          "Good coffee. Better Mondays.",
          "Fresh pour, no rush.",
          "Your table's waiting.",
          "Strong coffee, softer morning.",
          "Warm cup, quiet corner, good day.",
          "Pour. Sip. Repeat.",
        ],
      },
      {
        title: "Questions that get comments",
        captions: [
          "Flat white or filter: what's your order?",
          "Be honest: how many coffees before noon?",
          "Sweet treat with your coffee, or just the coffee?",
          "What should we put on the specials board this week?",
          "Hot or iced today?",
          "Tell us your usual. We'll pretend we haven't memorized it.",
        ],
      },
      {
        title: "Behind the counter",
        captions: [
          "The grinder is the first thing we switch on and the last thing we switch off.",
          "It takes a few tries to get the foam right. Here's today's best one.",
          "Every cup starts with a bag of beans and a barista who cares a bit too much about the temperature.",
          "Yes, we weigh the shots. Yes, it makes a difference.",
          "Before sunrise: grinder warm, milk cold, playlist on.",
          "The regulars know the best seat. Come and find yours.",
        ],
      },
      {
        title: "Gentle calls to action",
        captions: [
          "Walk in, order, stay as long as you like.",
          "Meeting a friend this weekend? Meet here.",
          "Grab a coffee on your way. We'll have it ready.",
          "Bring a book, we'll bring the coffee.",
          "Tag who you'd share this one with.",
          "Pre-order from the link in our bio and skip the wait.",
        ],
      },
      {
        title: "Cozy and seasonal",
        captions: [
          "Rainy day, warm cup, nowhere to be.",
          "Cold outside. Hot chocolate inside.",
          "Iced coffee season is officially open.",
          "Sunday plan: a pastry, a latte and zero emails.",
          "The new seasonal menu is now pouring.",
          "The best part of a long weekend is a slow coffee.",
        ],
      },
    ],
    tips: [
      {
        title: "Show the drink, then say something small",
        body: "Coffee photos all look alike, so the caption is where your cafe gets a personality. One honest line beats three clever ones.",
      },
      {
        title: "Ask one easy question a week",
        body: "\"Hot or iced?\" costs nothing and turns viewers into commenters, which tells Instagram people care about the post.",
      },
      {
        title: "Match the caption to what you really offer",
        body: "Only mention pre-ordering, specials or opening times you actually have. Edit the lines above so every word is true for your shop.",
      },
      {
        title: "Post when your own regulars are awake",
        body: "Early morning and mid-afternoon are the natural coffee moments. Check your Instagram insights for when your followers are online.",
      },
    ],
    faq: [
      {
        q: "How long should a coffee shop caption be?",
        a: "Short is fine. One line works for most posts. Use two or three sentences when you are telling a story, like a new menu item or a day behind the bar.",
      },
      {
        q: "Should I use emojis in cafe captions?",
        a: "A coffee cup or a pastry now and then is fine. One emoji at the end reads better than a string of them in the middle.",
      },
      ...PHOTO_FAQ,
    ],
  },

  "hair-salon-instagram-captions": {
    slug: "hair-salon-instagram-captions",
    businessType: "hair_salon",
    label: "Hair salons",
    metaTitle: "Hair Salon Instagram Captions: 30 to Copy + Free Tool",
    metaDescription:
      "30 original Instagram captions for hair salons, barbers and hairdressers, plus a free tool that writes captions from your own photo.",
    h1: "Instagram captions for hair salons and hairdressers",
    intro: [
      "Your photos already do the selling: a clean cut, a smooth color, a happy client. The caption's job is to say what happened and invite the next booking. Here are 30 you can copy and tweak.",
      "For captions written about the exact look in your photo, use the free tool: upload the picture and get five options, hashtags and three headlines for an ad.",
    ],
    groups: [
      {
        title: "Short and punchy",
        captions: [
          "New cut, same you, more confidence.",
          "Fresh from the chair.",
          "Hair day: sorted.",
          "Cut, color, repeat.",
          "Soft waves, strong opinion.",
          "Shine you can see from across the room.",
        ],
      },
      {
        title: "Before and after",
        captions: [
          "Before: tired ends. After: this.",
          "Same person, a few hours and one good cut apart.",
          "Swipe to see the change.",
          "Color correction takes patience. The result is worth the wait.",
          "We didn't change who she is. We just let her hair keep up.",
          "The glow-up is in the second photo.",
        ],
      },
      {
        title: "Questions that get comments",
        captions: [
          "Bob, lob or long layers: what's your next move?",
          "When did you last do something just for your hair?",
          "Warm tones or cool tones this season?",
          "Bring a photo or trust us? Both work.",
          "What does your hair always do when you're in a rush?",
          "Which look should we do on the next client, A or B?",
        ],
      },
      {
        title: "Behind the chair",
        captions: [
          "The consultation is the most important part of the cut.",
          "Good hair starts with listening before we pick up the scissors.",
          "Two chairs, one playlist, a lot of happy people.",
          "Color mixing: part science, part art, part patience.",
          "Every client leaves with a tip they can use at home.",
          "Sharp scissors, a good chat and a fresh start.",
        ],
      },
      {
        title: "Gentle calls to action",
        captions: [
          "Book your next appointment before you leave. Future you says thanks.",
          "Message us and we'll find a time that works.",
          "Overdue for a trim? We can fix that.",
          "Wedding or big event coming up? Plan your hair early.",
          "Tag a friend who has been saying \"I need a haircut\" for months.",
          "New clients welcome. Bring your inspiration photos.",
        ],
      },
    ],
    tips: [
      {
        title: "Lead with the result, then the story",
        body: "Put the best photo first, then use the caption to say what was done: the cut, the color, how long it took. Specific beats generic.",
      },
      {
        title: "Before and after posts are your strongest",
        body: "Use the same light and angle for both photos so the change is clearly yours and not the camera's.",
      },
      {
        title: "Ask permission and tag your client",
        body: "Always get a yes before you post a client's photo. Tagging them also puts your work in front of their friends.",
      },
      {
        title: "Say how to book",
        body: "End with one clear way to book, whether that is a link in your bio or a direct message. Do not make people guess.",
      },
    ],
    faq: [
      {
        q: "What hashtags work for a hair salon?",
        a: "Mix the look (for example a haircut style or color), your suburb or city, and the word salon or hairstylist. Local tags help nearby people find you.",
      },
      {
        q: "Can I use the same captions for a barber shop?",
        a: "Yes. Swap words like color for fade or beard where it fits, and use the free tool to get captions written about the actual photo.",
      },
      ...PHOTO_FAQ,
    ],
  },

  "boutique-instagram-captions": {
    slug: "boutique-instagram-captions",
    businessType: "boutique",
    label: "Boutiques",
    metaTitle: "Boutique Instagram Captions: 30 to Copy + Free Tool",
    metaDescription:
      "30 original Instagram captions for clothing and gift boutiques, plus a free tool that writes captions from your own product photo.",
    h1: "Instagram captions for boutiques",
    intro: [
      "A boutique sells taste: the pieces you chose and the way you put them together. These 30 captions help you show a new arrival, suggest an outfit or say thank you for shopping small.",
      "Have a photo of a new dress, bag or gift set? Upload it to the free tool and it writes captions about that exact item, plus hashtags and three ad headlines.",
    ],
    groups: [
      {
        title: "Short and punchy",
        captions: [
          "Just landed in store.",
          "Small shop, big wardrobe energy.",
          "Found: your new favorite jacket.",
          "Dress it up or dress it down.",
          "Made to be noticed, easy to wear.",
          "Soft colors, strong style.",
        ],
      },
      {
        title: "Outfit ideas",
        captions: [
          "One piece, three ways: work, weekend, dinner out.",
          "Layers for the in-between weather.",
          "A neutral base and one bold accessory.",
          "Everything in this look is in store now.",
          "Add a scarf. Change the whole outfit.",
          "The easiest outfit you'll own: this dress and flat shoes.",
        ],
      },
      {
        title: "New arrivals",
        captions: [
          "New arrivals, chosen by us for the shop.",
          "We buy in small batches, so you're less likely to meet yourself coming the other way.",
          "Restocked: the one you asked about all week.",
          "Once it's gone, it's gone. Come and try it on.",
          "Gift season is easier when you shop small.",
          "Something for her, something for you.",
        ],
      },
      {
        title: "Questions that get comments",
        captions: [
          "Which one are you taking home?",
          "Heels, flats or sneakers with this?",
          "Team neutral or team color?",
          "What should we restock next?",
          "Dress or jeans for Saturday?",
          "Which print is your favorite?",
        ],
      },
      {
        title: "The people behind the shop",
        captions: [
          "Every piece in the shop is one we'd wear ourselves.",
          "Small shop, real people, honest advice. Come and try things on.",
          "We'll tell you if it doesn't suit you. Promise.",
          "Behind the scenes: unpacking a new delivery.",
          "Thank you for shopping small. It really does help.",
          "Open the door, find something that feels like you.",
        ],
      },
    ],
    tips: [
      {
        title: "Show it on a person or in a scene",
        body: "A dress on a hanger is information. A dress on someone walking is a reason to visit. Even a styled corner of the shop works.",
      },
      {
        title: "Name the details",
        body: "Fabric, color name, sizes in stock and price (if you want to share it) turn a nice photo into a post people can act on.",
      },
      {
        title: "Do not promise what you do not have",
        body: "Lines such as \"once it's gone, it's gone\" are only true if stock really is limited. Edit each caption to match your shop.",
      },
      {
        title: "Reply to every comment",
        body: "A quick answer about sizing or price is a sale in the making, and it keeps the post alive in the feed.",
      },
    ],
    faq: [
      {
        q: "How often should a boutique post?",
        a: "Consistent beats frequent. Three good posts a week you can keep up is better than daily posts that fade after a month.",
      },
      {
        q: "Should I put prices in the caption?",
        a: "If your prices are a selling point, yes. If not, invite people to message or visit. Whatever you choose, make sure the price you show is the real one.",
      },
      ...PHOTO_FAQ,
    ],
  },

  "restaurant-instagram-captions": {
    slug: "restaurant-instagram-captions",
    businessType: "restaurant",
    label: "Restaurants and bakeries",
    metaTitle: "Restaurant Instagram Captions: 30 to Copy + Free Tool",
    metaDescription:
      "30 original Instagram captions for restaurants, takeaways and bakeries, plus a free tool that writes captions from your own food photo.",
    h1: "Instagram captions for restaurants, takeaways and bakeries",
    intro: [
      "Food photos get attention on their own. The caption is where you make someone hungry enough to book a table or order for pickup. Here are 30 captions you can copy and adjust.",
      "To get captions about the exact dish in your photo, use the free tool: upload the picture and get five options, hashtags and three ad headlines.",
    ],
    groups: [
      {
        title: "Short and punchy",
        captions: [
          "Hungry? Good.",
          "Today's table is waiting.",
          "Made fresh, served warm.",
          "One bite and you'll get it.",
          "Plates worth the photo.",
          "Comfort food, done properly.",
        ],
      },
      {
        title: "Questions that get comments",
        captions: [
          "Starters first or straight to the main?",
          "Share or no share?",
          "What's the one dish you'd order every time?",
          "Sweet or savory to finish?",
          "Spicy: yes or no?",
          "Pick next week's special: A or B?",
        ],
      },
      {
        title: "Behind the kitchen door",
        captions: [
          "The kitchen smells incredible right now.",
          "Prep starts long before the doors open.",
          "Chopped, tasted, adjusted, tasted again.",
          "Our chef's rule: if we wouldn't eat it, it doesn't leave the kitchen.",
          "Watch this one get plated.",
          "Same recipe, made by hand, every day.",
        ],
      },
      {
        title: "Gentle calls to action",
        captions: [
          "Book a table for the weekend. Link in bio.",
          "Craving this? Order for pickup.",
          "Bring friends. Order too much. Take leftovers home.",
          "Date night, sorted.",
          "Lunch break just got better.",
          "Order ahead and skip the wait.",
        ],
      },
      {
        title: "Moments and seasons",
        captions: [
          "Friday night starts here.",
          "Sunday lunch, the way it should be.",
          "Rainy night, warm bowl.",
          "Fresh pastries before the day gets busy.",
          "New on the menu this week.",
          "Birthdays, catch-ups, celebrations: we'd love to host yours.",
        ],
      },
    ],
    tips: [
      {
        title: "Shoot in natural light if you can",
        body: "A table by the window beats any overhead light. Take the photo before the food cools and the sauce dries.",
      },
      {
        title: "Name the dish",
        body: "\"Slow-cooked lamb shoulder\" does more than \"dinner\". Specific words make people hungry and help search.",
      },
      {
        title: "Only say what you can deliver",
        body: "Order ahead, pickup and booking lines should match what you really offer. Edit the captions above to fit.",
      },
      {
        title: "Add the practical bit",
        body: "End with where, when or how to order. Hungry people want the next step to be obvious.",
      },
    ],
    faq: [
      {
        q: "How often should a restaurant post on Instagram?",
        a: "A few times a week is plenty. Mix finished dishes, behind-the-scenes and the dining room, so the feed is not only plates.",
      },
      {
        q: "Does this work for a bakery or takeaway?",
        a: "Yes. Pick the restaurant type in the tool; it also suits bakeries, cafes with food and takeaways.",
      },
      ...PHOTO_FAQ,
    ],
  },

  "gym-instagram-captions": {
    slug: "gym-instagram-captions",
    businessType: "gym",
    label: "Gyms and fitness studios",
    metaTitle: "Gym Instagram Captions: 30 to Copy + Free Tool",
    metaDescription:
      "30 original Instagram captions for gyms, fitness and yoga studios, plus a free tool that writes captions from your own class photo.",
    h1: "Instagram captions for gyms and fitness studios",
    intro: [
      "Fitness posts work when they feel human: a real class, a real member, a real Monday. These 30 captions are written to sound encouraging rather than shouty, and you can change any of them to fit your studio.",
      "Got a photo from today's class? Upload it to the free tool and it writes captions about that exact moment, plus hashtags and three ad headlines.",
    ],
    groups: [
      {
        title: "Short and punchy",
        captions: [
          "Show up. That's the workout.",
          "Stronger than yesterday.",
          "Sweat now, smile later.",
          "One more set.",
          "Progress, not perfection.",
          "Your future self is watching.",
        ],
      },
      {
        title: "Encouragement",
        captions: [
          "Nobody regrets a workout they finished.",
          "It doesn't have to be a perfect session. It has to happen.",
          "Small habits, big difference over a year.",
          "The hardest rep is walking through the door.",
          "Rest days count too.",
          "Compare yourself to last month's you.",
        ],
      },
      {
        title: "Community",
        captions: [
          "Our members make this place. Thanks for showing up.",
          "First class done. Welcome to the crew.",
          "Train with a friend and you'll both show up more.",
          "Saturday class: full of good energy and loud music.",
          "Milestone check: who hit a personal best this week?",
          "Say hi to someone new today.",
        ],
      },
      {
        title: "Questions that get comments",
        captions: [
          "Morning workout or evening: which one are you?",
          "Leg day: love it or fear it?",
          "What's your goal this month?",
          "Lifting, cardio or class? Tell us your favorite.",
          "What song gets you through the last set?",
          "What got you started?",
        ],
      },
      {
        title: "Gentle calls to action",
        captions: [
          "Try a first class with a friend.",
          "Not sure where to start? Message us and we'll help.",
          "Doors open, equipment ready. Your turn.",
          "New class timetable: link in bio.",
          "Bring a water bottle and we'll handle the rest.",
          "Book a trial session this week.",
        ],
      },
    ],
    tips: [
      {
        title: "Show real people, with permission",
        body: "Members mid-class beat stock-style poses. Always ask before you post someone's photo, and tag them if they agree.",
      },
      {
        title: "Avoid promises about results",
        body: "Do not guarantee weight loss or timelines. Talk about showing up, habits and how a class feels instead.",
      },
      {
        title: "Make the first step small",
        body: "\"Try a first class with a friend\" is easier to say yes to than \"join today\". Offer a trial only if you really have one.",
      },
      {
        title: "Post the timetable",
        body: "People decide in seconds. A clear class list in your bio or highlights saves them a message.",
      },
    ],
    faq: [
      {
        q: "What should a gym post about besides workouts?",
        a: "Members' milestones, a class behind the scenes, coach introductions and answers to common beginner questions all work well.",
      },
      {
        q: "Does it work for yoga or pilates studios?",
        a: "Yes. Choose the gym or fitness studio type; the captions and the tool both suit yoga, pilates and group classes.",
      },
      ...PHOTO_FAQ,
    ],
  },

  "product-description-generator-from-photo": {
    slug: "product-description-generator-from-photo",
    businessType: "ecommerce",
    label: "Product descriptions",
    metaTitle: "Free Product Description Generator From Photo | Punqle",
    metaDescription:
      "Upload a product photo and get a product description, Instagram captions, hashtags and ad headlines. Free, no login. Plus 12 examples to adapt.",
    h1: "Product description generator from photo",
    intro: [
      "Upload one photo of your product and get a product description written from what is actually in the picture, plus five Instagram captions, hashtags and three ad headlines. It also lists the facts a photo cannot show, such as size, material and price, so you know exactly what to add before you publish.",
      "Use it for Shopify, Etsy, Instagram shops or your own site. The tool never invents materials, ingredients, results or certifications. If you tell it something in the note, it will use it; if not, it leaves it out.",
    ],
    listTitle: "12 product description examples to adapt",
    listIntro: "Replace every [bracket] with your own facts, and delete any line that is not true for your product.",
    groups: [
      {
        title: "Clothing and accessories",
        captions: [
          "A relaxed [fit] [garment] in [color], cut from [fabric]. It sits at [length] and works with jeans or a skirt. Available in [sizes]. Machine wash cold.",
          "Meet the [name]: a [color] [type of bag] with room for your phone, wallet and keys. [Closure], one inner pocket and a [length] strap. Measures [dimensions].",
          "Soft and easy to layer. This [color] [scarf or knit] is made from [material] and measures [size]. Wear it long, wrapped or tucked into a coat.",
        ],
      },
      {
        title: "Beauty and skincare",
        captions: [
          "A lightweight [product type] with [key ingredient, as listed on your label]. Smooth it over clean skin, morning or night. [Size] ml. Patch test before first use.",
          "[Product name] is a [texture] [product type] in a [color] glass bottle. Scent: [notes]. How to use: [steps]. Made in [place]. Full ingredient list below.",
          "A gentle [product type] for daily use. Add one pump to damp skin, massage in and rinse. [Size] ml. Ingredients are listed in full on the pack.",
        ],
      },
      {
        title: "Home and gifts",
        captions: [
          "A [wax type] candle in a [color] [vessel]. Scent: [notes]. Burn time about [hours] hours. [Weight]. Trim the wick to 5 mm before each burn.",
          "A [material] [item] in [color], [dimensions]. It looks good on a shelf and works as a gift. Arrives in [packaging].",
          "A set of [number] [items]: [list them]. Arrives wrapped in [packaging], with a note card if you ask. Ships from [place] within [number] business days.",
        ],
      },
      {
        title: "Pets and food",
        captions: [
          "A sturdy [material] [toy or collar] in [color] for [size] dogs. [Dimensions]. Wipes clean. Always supervise play.",
          "[Product name]: [flavor] [type] made with [main ingredients]. [Weight] pack. Store in a cool, dry place. Best before [date format].",
          "A cozy [bed or blanket] for cats and small dogs. [Dimensions], [material], machine washable at [temperature].",
        ],
      },
    ],
    cta: {
      title: "Do your whole catalog, not just one product",
      body: "Punqle imports your Shopify or CSV products and makes a ready-to-post ad for each one, using your brand kit.",
    },
    tips: [
      {
        title: "Start with what the buyer sees",
        body: "Say what the product is and what it looks like in the first sentence. Shoppers decide in seconds, and the photo already shows them most of it.",
      },
      {
        title: "Add the facts a photo cannot show",
        body: "Size, material, price, care and shipping answer the questions that stop people buying. The tool lists the ones to add for your product.",
      },
      {
        title: "Write for one person",
        body: "Picture a single customer and answer their questions. A plain description beats a long one full of adjectives.",
      },
      {
        title: "Only claim what you can prove",
        body: "Words such as organic, handmade, vegan or anything about results on skin or health need to be true and, in many places, allowed. When unsure, leave them out.",
      },
    ],
    faq: [
      {
        q: "What should a product description include?",
        a: "What it is, what it looks like, who or what it is for, the key facts (size, material, how to use or care for it) and how it ships. Keep each as one short line.",
      },
      {
        q: "How long should a product description be?",
        a: "Long enough to answer a buyer's questions and no longer. Many small-shop items work well in 50 to 100 words, with more for products that need explaining.",
      },
      {
        q: "Can I paste the result into Shopify or Etsy?",
        a: "Yes. Copy it into any store, but read it first and add your own facts, such as size and price, so every word is true for your product.",
      },
      ...PHOTO_FAQ,
    ],
  },

  "new-arrival-captions-for-instagram": {
    slug: "new-arrival-captions-for-instagram",
    businessType: "ecommerce",
    label: "New arrivals",
    metaTitle: "New Arrival Captions for Instagram: 30 to Copy + Free Tool",
    metaDescription:
      "30 original captions for new arrivals, restocks and product drops, plus a free tool that writes captions from your own product photo.",
    h1: "New arrival captions for Instagram",
    intro: [
      "New arrivals are the posts your followers are most likely to act on, so the caption should do three things: say what is new, make it easy to picture, and tell people what to do next. Here are 30 you can copy and tweak.",
      "Have the product photo ready? Upload it to the free tool and it writes captions about that exact item, plus hashtags, a product description and three ad headlines.",
    ],
    groups: [
      {
        title: "Short and punchy",
        captions: [
          "New in.",
          "Just landed.",
          "Fresh drop, now online.",
          "New arrivals, sorted.",
          "Say hello to the new collection.",
          "Meet the newest arrivals.",
        ],
      },
      {
        title: "Teasers before the launch",
        captions: [
          "Something new is coming on [day]. Can you guess what?",
          "Three days to go. Here's a small peek.",
          "We've been keeping this one quiet.",
          "Photos from the studio. The drop is almost here.",
          "Set a reminder: new arrivals go live [day] at [time].",
          "What would you like to see in the next drop? Tell us below.",
        ],
      },
      {
        title: "Restocks and sell-outs",
        captions: [
          "Back in stock: the one you kept asking about.",
          "Restocked. Some sizes are limited, so don't wait too long.",
          "Sold out last time. Back today.",
          "Small batch, so when it's gone, it's gone.",
          "Want to know when it's back? Send us a message.",
          "You asked, we restocked.",
        ],
      },
      {
        title: "Details and styling",
        captions: [
          "Three ways to wear the new [item].",
          "Close-up of the [fabric or finish]: this is what you get.",
          "Real photo, no filter. Colors may look slightly different on your screen.",
          "What goes with it? Everything in the second photo.",
          "Measurements are on the last slide.",
          "Packed by us and posted within [number] business days.",
        ],
      },
      {
        title: "Gentle calls to action",
        captions: [
          "Shop the new arrivals: link in bio.",
          "Tap the product tags to see price and sizes.",
          "Order today and we'll ship it on [day].",
          "Questions about sizing? Message us.",
          "Free shipping on orders over $[amount] this week.",
          "Buying for someone else? We can add a note.",
        ],
      },
    ],
    cta: {
      title: "Announce every new product in minutes",
      body: "Add your products once. Punqle makes a ready-to-post ad for each new arrival, so a drop takes minutes, not an afternoon.",
    },
    tips: [
      {
        title: "Lead with the product, not the news",
        body: "Show the item clearly in the first photo. The caption can say \"new\", but the picture has to earn the stop.",
      },
      {
        title: "Give the facts people ask for",
        body: "Price, sizes and shipping are the three most common questions. Answer them in the caption or on the last slide.",
      },
      {
        title: "Tease, drop, restock",
        body: "One product can earn three posts: a peek before the launch, the drop itself, and a restock later. Reuse the same photo set differently.",
      },
      {
        title: "Do not promise what you do not have",
        body: "Lines such as \"limited\" or \"free shipping\" are only fair if they are true. Edit every caption to match your shop.",
      },
    ],
    faq: [
      {
        q: "How often should I post new arrivals?",
        a: "As often as you really have something new. A steady rhythm, such as one drop a week or a month, works better than posting everything at once.",
      },
      {
        q: "Should new arrival posts be reels or photos?",
        a: "Both work. A clear photo or carousel shows detail; a short reel shows movement, texture and fit. Try one of each and see what your followers respond to.",
      },
      ...PHOTO_FAQ,
    ],
  },

  "skincare-captions-for-instagram": {
    slug: "skincare-captions-for-instagram",
    businessType: "ecommerce",
    label: "Skincare brands",
    metaTitle: "Skincare Captions for Instagram: 30 to Copy + Free Tool",
    metaDescription:
      "30 original Instagram captions for skincare and beauty brands that stay honest (no medical claims), plus a free tool that writes captions from your product photo.",
    h1: "Skincare captions for Instagram",
    intro: [
      "Skincare is a trust business. The best captions explain how to use the product, show the ingredients openly and never promise results the product cannot guarantee. Here are 30 captions written that way, ready to copy and tweak.",
      "For captions and a product description about your exact product, upload its photo to the free tool.",
    ],
    groups: [
      {
        title: "Short and punchy",
        captions: [
          "Skin first.",
          "Simple routine, steady habit.",
          "One step at a time.",
          "Cleanse. Moisturize. Repeat.",
          "Soft light, clean skin, calm morning.",
          "Your evening ritual, in one bottle.",
        ],
      },
      {
        title: "Routines and how to use",
        captions: [
          "Morning routine: cleanse, moisturize, sunscreen. That's it.",
          "Evening routine: take your time. Skin likes consistency.",
          "How we use it: two pumps on damp skin, press in, done.",
          "Patch test first, always. Here's how.",
          "Layering order for beginners: thinnest texture first.",
          "Sunday reset: slow, quiet and no phone.",
        ],
      },
      {
        title: "Ingredients and honesty",
        captions: [
          "The full ingredient list is in the last slide.",
          "What's in it, why it's in there, how to use it. Swipe.",
          "Results vary from person to person, so we never promise a timeline.",
          "Every skin is different. Start slowly and see how yours responds.",
          "Questions about an ingredient? Send us a message.",
          "Close-up of the texture, shot without a filter.",
        ],
      },
      {
        title: "Questions that get comments",
        captions: [
          "What's your one non-negotiable skincare step?",
          "Morning or night person, skincare edition?",
          "Cleanser first or toner first? Settle it for us.",
          "How many steps is too many?",
          "Which texture do you prefer: gel, cream or oil?",
          "What should we make next?",
        ],
      },
      {
        title: "Gentle calls to action",
        captions: [
          "Shop the routine: link in bio.",
          "New to the range? Start with the cleanser.",
          "Ask about sample sizes before you buy.",
          "Gift sets are in the shop now.",
          "Sizes and refills are on the product page.",
          "Not sure where to start? Message us and we'll point you to the right one.",
        ],
      },
    ],
    cta: {
      title: "Make an ad for every product in your range",
      body: "Import your Shopify or CSV catalog and Punqle makes a ready-to-post ad for each product, in your brand colors.",
    },
    tips: [
      {
        title: "Show the texture and the bottle",
        body: "A clean close-up of the product and the pack does more than a long description. Natural light and a plain background work best.",
      },
      {
        title: "Say how to use it",
        body: "\"Two pumps on damp skin\" is a caption people save. Clear steps build trust and cut down on questions.",
      },
      {
        title: "Avoid medical claims",
        body: "Do not say a product treats, cures or prevents a skin condition. Describe how it feels and how to use it, and check the rules in your country.",
      },
      {
        title: "Be open about ingredients",
        body: "Link to or show the full list. Shoppers with allergies or preferences will thank you, and honest brands stand out.",
      },
    ],
    faq: [
      {
        q: "Can I say my product treats acne or wrinkles?",
        a: "Be careful. Claims about treating a condition can make a product count as a medicine or therapeutic good in many countries, including Australia and the US, and advertising platforms restrict them. Focus on texture, use and ingredients, and check your local rules.",
      },
      {
        q: "What hashtags work for skincare?",
        a: "Use ones that describe the product and routine (for example the product type and skin type) plus a few about your brand or location. Avoid hashtags that promise results.",
      },
      ...PHOTO_FAQ,
    ],
  },
};

export const TOOL_SLUGS = Object.keys(TOOL_PAGES);
export const NICHE_SLUGS = TOOL_SLUGS.filter((s) => s !== "caption-generator-from-photo");

export function toolUrl(slug: string): string {
  return `${SITE_ORIGIN}/tools/${slug}`;
}
