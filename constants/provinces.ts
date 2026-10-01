export const provinces: string[] = [
  "Phnom Penh",
  "Siem Reap",
  "Battambang",
  "Kampong Cham",
  "Kampong Speu",
  "Sihanoukville",
  "Kampot",
  "Kandal",
  "Takeo",
  "Kampong Thom",
  "Pursat",
  "Prey Veng",
];

// Approximate provincial-capital coordinates. The backend's discover needs a
// location, and we report the user's chosen province rather than asking for
// GPS access.
export const provinceCoords: Record<string, { latitude: number; longitude: number }> = {
  "Phnom Penh": { latitude: 11.5564, longitude: 104.9282 },
  "Siem Reap": { latitude: 13.3671, longitude: 103.8448 },
  Battambang: { latitude: 13.0957, longitude: 103.2022 },
  "Kampong Cham": { latitude: 11.9934, longitude: 105.4635 },
  "Kampong Speu": { latitude: 11.4533, longitude: 104.5209 },
  Sihanoukville: { latitude: 10.6253, longitude: 103.5234 },
  Kampot: { latitude: 10.5943, longitude: 104.1640 },
  Kandal: { latitude: 11.4550, longitude: 104.9390 },
  Takeo: { latitude: 10.9908, longitude: 104.7850 },
  "Kampong Thom": { latitude: 12.7111, longitude: 104.8887 },
  Pursat: { latitude: 12.5388, longitude: 103.9192 },
  "Prey Veng": { latitude: 11.4868, longitude: 105.3253 },
};

export const genderOptions = ["male", "female"] as const;
export const lookingForOptions = ["Men", "Women", "Everyone"] as const;

export const relationshipGoals = [
  "Serious relationship",
  "Something casual",
  "New friends",
  "Still figuring it out",
];

export const interestOptions = [
  "Coffee",
  "Travel",
  "Music",
  "Reading",
  "Cooking",
  "Movies",
  "Fitness",
  "Photography",
  "Dancing",
  "Gaming",
  "Foodie",
  "Nature",
  "Art",
  "Fashion",
  "Volunteering",
];
