// ABOUTME: Deterministic aggregate music records for offline browser checks.
// ABOUTME: These fixtures are served by test interception and never shipped as fallback data.
export const musicApi = "https://api.listenbrainz.org/1/stats/sitewide/recordings?range=week&count=4";
export const musicChart = { payload: {
  range: "week", from_ts: 1788134400, to_ts: 1788739200, last_updated: 1789180716,
  recordings: ["A first song", "ある街の小さな音楽", "A very long song title that wraps across narrow screens", "Fourth track"].map((track_name, index) => ({ track_name, artist_name: `Test artist ${index + 1}`, listen_count: 1234 - index, recording_mbid: "6f33dc05-cdc0-4a2f-8039-e8fed082eec6" })),
} };
