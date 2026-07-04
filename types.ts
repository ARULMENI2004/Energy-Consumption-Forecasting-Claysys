export interface EnergyRecord {
  timestamp: string; // ISO String
  timestampMs?: number; // Numeric timestamp in milliseconds for high-speed queries
  activePower: number; // kW
  reactivePower: number; // kW
  voltage: number; // V
  intensity: number; // A
  subMetering1: number; // Kitchen (Wh)
  subMetering2: number; // Laundry (Wh)
  subMetering3: number; // Climate Control (Wh)
  otherMetering: number; // Remaining energy
}

export interface ForecastRecord {
  timestamp: string; // ISO String
  historical?: number; // Actual value if overlaps
  predicted: number; // Predicted Active Power (kW)
  lowerBound: number; // Confidence interval min
  upperBound: number; // Confidence interval max
}

export interface SavedReport {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  notes: string;
  metrics: {
    totalConsumption: number;
    peakDemand: number;
    peakHour: number;
    averageVoltage: number;
    co2Footprint: number;
    estimatedCost: number;
    efficiencyGain: number; // %
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  savingsGoal?: number; // target monthly consumption (kWh)
  createdAt: string;
}

export interface FilterOptions {
  startDate: string;
  endDate: string;
  viewMode: 'hourly' | 'daily' | 'weekly';
  subMetering: 'all' | 'kitchen' | 'laundry' | 'climate' | 'other';
  stateTariff?: string;
}
