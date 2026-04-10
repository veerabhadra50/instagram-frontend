const BASE = "http://localhost:5000/api/instagram";

const get = (url: string) => fetch(url).then(r => r.json());

export const api = {
  // Analytics (profile + posts + reels combined)
  getAnalytics:        (username: string) => get(`${BASE}/analytics/${username}`),

  // Profile
  getProfile:          (username: string) => get(`${BASE}/profile/${username}`),
  getAccount:          (username: string) => get(`${BASE}/account/${username}`),
  getAccountV2:        (username: string) => get(`${BASE}/account-v2/${username}`),
  getAbout:            (username: string) => get(`${BASE}/about/${username}`),
  getSimilar:          (username: string) => get(`${BASE}/similar/${username}`),

  // Content
  getPosts:            (username: string) => get(`${BASE}/posts/${username}`),
  getReels:            (username: string) => get(`${BASE}/reels/${username}`),
  getStories:          (username: string) => get(`${BASE}/stories/${username}`),
  getHighlights:       (username: string) => get(`${BASE}/highlights/${username}`),
  getHighlightStories: (highlightId: string) => get(`${BASE}/highlight-stories/${highlightId}`),
  getTagged:           (username: string) => get(`${BASE}/tagged/${username}`),

  // Followers
  getFollowers:        (username: string) => get(`${BASE}/followers/${username}`),
  getFollowersV2:      (username: string) => get(`${BASE}/followers-v2/${username}`),

  // Media
  getMediaV2:          (mediaCode: string) => get(`${BASE}/media/v2/${mediaCode}`),
  getMedia:            (url: string, type: "post" | "reel") => get(`${BASE}/media?url=${encodeURIComponent(url)}&type=${type}`),
  getMediaById:        (mediaCode: string, mediaId: string) => get(`${BASE}/media/id?media_code=${mediaCode}&media_id=${mediaId}`),
  getMediaTitle:       (url: string, type: string) => get(`${BASE}/media/title?url=${encodeURIComponent(url)}&type=${type}`),
  getMediaLikers:      (mediaCode: string) => get(`${BASE}/media/likers/${mediaCode}`),
  getMediaComments:    (mediaCode: string) => get(`${BASE}/media/comments/${mediaCode}`),
  getMediaReplies:     (postId: string, commentId: string) => get(`${BASE}/media/replies?post_id=${postId}&comment_id=${commentId}`),

  // Discovery
  getHashtag:          (hashtag: string) => get(`${BASE}/hashtag/${hashtag}`),
  search:              (query: string)   => get(`${BASE}/search?q=${encodeURIComponent(query)}`),
};
