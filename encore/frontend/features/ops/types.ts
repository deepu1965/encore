export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  activeConnections: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  lastUpdated: string;
}

export interface KafkaTopic {
  name: string;
  partitions: number;
  consumerLag: number;
  bytesInPerSec: number;
  bytesOutPerSec: number;
}

export const opsKeys = {
  health: () => ['ops', 'health'] as const,
  kafkaTopics: () => ['ops', 'kafka', 'topics'] as const,
};
