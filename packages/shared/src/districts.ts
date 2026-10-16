import type { ShippingZone } from "./cart";

/** All 64 districts of Bangladesh, grouped by division in the list order. */
export const BD_DISTRICTS = [
  // Barishal
  "Barguna",
  "Barishal",
  "Bhola",
  "Jhalokati",
  "Patuakhali",
  "Pirojpur",
  // Chattogram
  "Bandarban",
  "Brahmanbaria",
  "Chandpur",
  "Chattogram",
  "Cox's Bazar",
  "Cumilla",
  "Feni",
  "Khagrachhari",
  "Lakshmipur",
  "Noakhali",
  "Rangamati",
  // Dhaka
  "Dhaka",
  "Faridpur",
  "Gazipur",
  "Gopalganj",
  "Kishoreganj",
  "Madaripur",
  "Manikganj",
  "Munshiganj",
  "Narayanganj",
  "Narsingdi",
  "Rajbari",
  "Shariatpur",
  "Tangail",
  // Khulna
  "Bagerhat",
  "Chuadanga",
  "Jashore",
  "Jhenaidah",
  "Khulna",
  "Kushtia",
  "Magura",
  "Meherpur",
  "Narail",
  "Satkhira",
  // Mymensingh
  "Jamalpur",
  "Mymensingh",
  "Netrokona",
  "Sherpur",
  // Rajshahi
  "Bogura",
  "Chapainawabganj",
  "Joypurhat",
  "Naogaon",
  "Natore",
  "Pabna",
  "Rajshahi",
  "Sirajganj",
  // Rangpur
  "Dinajpur",
  "Gaibandha",
  "Kurigram",
  "Lalmonirhat",
  "Nilphamari",
  "Panchagarh",
  "Rangpur",
  "Thakurgaon",
  // Sylhet
  "Habiganj",
  "Moulvibazar",
  "Sunamganj",
  "Sylhet",
] as const;
export type BdDistrict = (typeof BD_DISTRICTS)[number];

export const isBdDistrict = (value: string): value is BdDistrict =>
  (BD_DISTRICTS as readonly string[]).includes(value);

/** Delivery zone drives the shipping fee: Dhaka district is inside, everything else outside. */
export const shippingZoneForDistrict = (district: string): ShippingZone =>
  district === "Dhaka" ? "INSIDE_DHAKA" : "OUTSIDE_DHAKA";
