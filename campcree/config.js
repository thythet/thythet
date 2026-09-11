window.CAMP_CONFIG = {
  app: {
    name: "CampCree",
    shortName: "CampCree",
    url: "https://campcree.com",
    language: "en",
    debug: false
  },

  owner: {
    name: "Thy Thet",
    email: "thythetopen@gmail.com"
  },

  firebase: {
    enabled: true,
    sdkVersion: "12.18.0",
    analytics: true,
    storageEnabled: false,

    config: {
      apiKey: "AIzaSyAFQ56qAgAPlOgf7_IFlzHeJMqwHkyskEw",
      authDomain: "campcree-a5c70.firebaseapp.com",
      databaseURL: "https://campcree-a5c70-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "campcree-a5c70",
      storageBucket: "campcree-a5c70.firebasestorage.app",
      messagingSenderId: "912970256108",
      appId: "1:912970256108:web:d409cbb54884d3d5ea5fc9",
      measurementId: "G-ED0NP1XL88"
    }
  },

  storage: {
    mode: "local",

    local: {
      base: "assets/images/"
    },

    cloudinary: {
      enabled: false,
      cloudName: "",
      uploadPreset: "",
      folder: "campcree"
    },

    hosting: {
      enabled: false,
      uploadEndpoint: "",
      deleteEndpoint: ""
    },

    firebase: {
      enabled: false,
      rootFolder: "campcree",
      postsFolder: "posts",
      galleryFolder: "gallery",
      profileFolder: "profiles"
    }
  },

  upload: {
    maxImages: 20,
    maxImageMB: 15,

    compress: true,
    convertToWebP: true,

    maxWidth: 2560,
    quality: 0.88,

    hd: {
      enabled: true,
      maxWidth: 4096,
      quality: 0.94
    },

    thumbnail: {
      enabled: true,
      maxWidth: 640,
      quality: 0.82
    }
  },

  appearance: {
    accent: "#E94B55",
    accent2: "#FF765F",

    theme: "system",

    radius: 6,
    spacing: 12,
    border: 1,
    glass: 88,

    density: "normal",
    motion: "smooth"
  },

  appearanceLimits: {
    radius: {
      min: 6,
      max: 28
    },

    spacing: {
      min: 4,
      max: 20
    },

    border: {
      min: 0,
      max: 3
    },

    glass: {
      min: 55,
      max: 96
    }
  },

  features: {
    login: true,
    googleLogin: true,

    posts: true,
    createPosts: true,

    gallery: true,

    likes: true,
    saves: true,
    shares: true,
    views: true,

    search: true,

    notifications: true,
    creatorRequests: true,

    admin: true,

    comments: false,
    presence: false
  },

  posts: {
    defaultAudience: "public",

    allowedTypes: [
      "story",
      "news",
      "program",
      "event",
      "announcement",
      "video",
      "document"
    ],

    statuses: [
      "draft",
      "pending",
      "published",
      "hidden"
    ],

    memberRequiresApproval: true,
    creatorRequiresApproval: true,

    editorPublishesDirectly: true,
    adminPublishesDirectly: true
  },

  admin: {
    enabled: true,

    /*
      Client-side owner bootstrap.

      IMPORTANT:
      Firebase Rules must ALSO verify your authenticated
      Google account. This setting alone is not security.
    */

    ownerBootstrapEnabled: true,

    ownerName: "Thy Thet",
    ownerEmail: "thythetopen@gmail.com"
  },

  database: {
    appearance: "settings/appearance",
    features: "settings/features",
    site: "settings/site",

    users: "users",

    posts: "posts",
    postLikes: "postLikes",
    postViews: "postViews",
    postSaves: "postSaves",

    comments: "comments",

    albums: "albums",
    media: "media",

    programs: "programs",
    events: "events",
    partners: "partners",

    notifications: "notifications",

    creatorRequests: "creatorRequests",

    adminLogs: "adminLogs"
  },

  gallery: {
    defaultLayout: "grid",

    layouts: [
      "grid",
      "masonry",
      "compact",
      "filmstrip"
    ],

    defaultSize: 250,

    minSize: 160,
    maxSize: 420,
    sizeStep: 10
  },

  ui: {
    mobileBottomNav: true,

    ripple: true,

    smoothReveal: true,

    glassSheets: true,

    reducedMotionSupport: true
  }
};