# Component Inventory

Visual/interaction design for each component is in `design-system.md`. This document is the implementation-task side: every reusable component has a build task and, where flagged accessibility-critical, a dedicated a11y task — not folded into a generic 'component library' catch-all.

| Component | Category | A11y Critical | Task Count | Task IDs |
|---|---|---|---|---|
| Button | primitive | Yes | 2 | V15-COMP-001, V15-COMP-002 |
| Input | primitive | Yes | 2 | V15-COMP-003, V15-COMP-004 |
| Select | primitive | Yes | 2 | V15-COMP-005, V15-COMP-006 |
| Combobox | primitive | Yes | 2 | V15-COMP-007, V15-COMP-008 |
| Search | primitive | Yes | 2 | V15-COMP-009, V15-COMP-010 |
| Card | primitive | No | 1 | V15-COMP-011 |
| Badge | primitive | No | 1 | V15-COMP-012 |
| Modal | primitive | Yes | 2 | V15-COMP-013, V15-COMP-014 |
| Drawer | primitive | Yes | 2 | V15-COMP-015, V15-COMP-016 |
| Toast | primitive | Yes | 2 | V15-COMP-017, V15-COMP-018 |
| Tooltip | primitive | Yes | 2 | V15-COMP-019, V15-COMP-020 |
| Tabs | primitive | Yes | 2 | V15-COMP-021, V15-COMP-022 |
| Dropdown | primitive | Yes | 2 | V15-COMP-023, V15-COMP-024 |
| Table | primitive | Yes | 2 | V15-COMP-025, V15-COMP-026 |
| Pagination | primitive | No | 1 | V15-COMP-027 |
| DatePicker | primitive | Yes | 2 | V15-COMP-028, V15-COMP-029 |
| Progress | primitive | Yes | 2 | V15-COMP-030, V15-COMP-031 |
| Skeleton | primitive | Yes | 2 | V15-COMP-032, V15-COMP-033 |
| AppShell | composite | Yes | 2 | V15-COMP-034, V15-COMP-035 |
| Header | composite | Yes | 2 | V15-COMP-036, V15-COMP-037 |
| Sidebar | composite | Yes | 2 | V15-COMP-038, V15-COMP-039 |
| MobileNav | composite | Yes | 2 | V15-COMP-040, V15-COMP-041 |
| Footer | composite | No | 1 | V15-COMP-042 |
| EventCard | composite | No | 1 | V15-COMP-043 |
| VenueCard | composite | No | 1 | V15-COMP-044 |
| Seat | composite | Yes | 2 | V15-COMP-045, V15-COMP-046 |
| SeatMap | composite | Yes | 2 | V15-COMP-047, V15-COMP-048 |
| SeatLegend | composite | No | 1 | V15-COMP-049 |
| SeatTooltip | composite | Yes | 2 | V15-COMP-050, V15-COMP-051 |
| HoldCountdown | composite | Yes | 2 | V15-COMP-052, V15-COMP-053 |
| QueuePosition | composite | Yes | 2 | V15-COMP-054, V15-COMP-055 |
| QueueProgress | composite | No | 1 | V15-COMP-056 |
| PaymentStatus | composite | Yes | 2 | V15-COMP-057, V15-COMP-058 |
| OrderStatus | composite | No | 1 | V15-COMP-059 |
| TicketCard | composite | No | 1 | V15-COMP-060 |
| TicketQR | composite | Yes | 2 | V15-COMP-061, V15-COMP-062 |
| WalletBalance | composite | No | 1 | V15-COMP-063 |
| LedgerTable | composite | Yes | 2 | V15-COMP-064, V15-COMP-065 |
| ListingCard | composite | No | 1 | V15-COMP-066 |
| TradeStatus | composite | No | 1 | V15-COMP-067 |
| SettlementTimeline | composite | No | 1 | V15-COMP-068 |
| NotificationItem | composite | Yes | 2 | V15-COMP-069, V15-COMP-070 |
| ChatMessage | composite | No | 1 | V15-COMP-071 |
| PresenceIndicator | composite | No | 1 | V15-COMP-072 |
| MetricCard | composite | No | 1 | V15-COMP-073 |
| Chart | composite | Yes | 2 | V15-COMP-074, V15-COMP-075 |
| DataTable | composite | Yes | 2 | V15-COMP-076, V15-COMP-077 |
| RateLimitBanner | composite | Yes | 2 | V15-COMP-078, V15-COMP-079 |
| Timeline | composite | No | 1 | V15-COMP-080 |
| EmptyState | composite | No | 1 | V15-COMP-081 |
| ErrorState | composite | No | 1 | V15-COMP-082 |
| PermissionDenied | composite | No | 1 | V15-COMP-083 |
| OfflineBanner | composite | Yes | 2 | V15-COMP-084, V15-COMP-085 |
| ReconnectingBadge | composite | Yes | 2 | V15-COMP-086, V15-COMP-087 |
| MaintenanceScreen | composite | No | 1 | V15-COMP-088 |
| ConfirmationDialog | composite | Yes | 2 | V15-COMP-089, V15-COMP-090 |
| ServiceStatus | composite | No | 1 | V15-COMP-091 |
| HealthIndicator | composite | No | 1 | V15-COMP-092 |
| LogViewer | composite | Yes | 2 | V15-COMP-093, V15-COMP-094 |
| TraceViewer | composite | Yes | 2 | V15-COMP-095, V15-COMP-096 |
| IncidentTimeline | composite | No | 1 | V15-COMP-097 |
| DeploymentProgress | composite | No | 1 | V15-COMP-098 |
| KafkaPanel | composite | No | 1 | V15-COMP-099 |
| RedisPanel | composite | No | 1 | V15-COMP-100 |
| DatabasePanel | composite | No | 1 | V15-COMP-101 |
| PaymentPanel | composite | Yes | 2 | V15-COMP-102, V15-COMP-103 |
| FilterPanel | composite | Yes | 2 | V15-COMP-104, V15-COMP-105 |
| ServiceMap | composite | Yes | 2 | V15-COMP-106, V15-COMP-107 |

**Coverage: 68/68 components have at least one implementation task. Missing: 0.**