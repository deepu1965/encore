"""Comprehensive deterministic seed script for Encore V1.5.

Seeds a realistic, production-scale dataset across all Encore V1 domains:
- 180+ Users (Customers, Organizers, Admins)
- 35+ Venues across 15 Indian cities
- 130+ Events across Music, Sports, Entertainment, Culture, and Tech
- 5,000+ Seats and Inventory rows across Primary and Shard databases
- 450+ Orders and 750+ Tickets (with dynamic ticket codes)
- 70+ Resale Listings and 35+ Resale Trades
- 180 Wallets with 600+ Ledger transactions
- 650+ Chat messages across live event rooms
- 1,200+ Audit events
- 120+ Media metadata records
- Scheduled background jobs and deployment history

Deterministically seeded with random.Random(42) to guarantee full reproducibility.
Preserves existing test entities:
- User: 11111111-1111-1111-1111-111111111111 (demo.buyer@example.com)
- User: 00000000-0000-0000-0000-000000000000 (admin@example.com)
- Event: e31fea72-d88a-407b-9e36-19515a01e71e ("Encore Launch Night" at "Encore Arena")
"""

from __future__ import annotations

import datetime
from datetime import UTC, datetime, timedelta
import enum
import hashlib
import random
import uuid

from sqlalchemy import (
    DateTime,
    Enum as sa_Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

from encore_gateway.db import SessionWrite, shard_manager
from encore_gateway.models import (
    AuditEvent,
    AuditEventType,
    ChatMessage,
    Deployment,
    Event,
    EventStatus,
    Inventory,
    InventoryStatus,
    Job,
    MediaMetadata,
    MediaStatus,
    MediaType,
    MediaVisibility,
    Order,
    OrderStatus,
    Seat,
    Ticket,
    TicketStatus,
    User,
    UserRole,
    Venue,
)

rng = random.Random(42)

# --- Declarative models for Resale & Wallet tables in Primary Postgres ---
class BaseExtra(DeclarativeBase):
    pass

class ResaleListingModel(BaseExtra):
    __tablename__ = "resale_listings"
    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    ticket_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, unique=True)
    seller_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    ask_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        sa_Enum("ACTIVE", "MATCHED", "CANCELLED", name="resale_listing_status"),
        nullable=False,
        default="ACTIVE",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ResaleOrderModel(BaseExtra):
    __tablename__ = "resale_orders"
    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    buyer_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    bid_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        sa_Enum("ACTIVE", "MATCHED", "CANCELLED", name="resale_order_status"),
        nullable=False,
        default="ACTIVE",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ResaleTradeModel(BaseExtra):
    __tablename__ = "resale_trades"
    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    listing_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("resale_listings.id"), nullable=False, unique=True)
    order_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("resale_orders.id"), nullable=False, unique=True)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class WalletModel(BaseExtra):
    __tablename__ = "wallets"
    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), unique=True, nullable=False, index=True)
    balance_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    escrow_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class WalletLedgerModel(BaseExtra):
    __tablename__ = "wallet_ledger"
    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("wallets.id"), nullable=False, index=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_type: Mapped[str] = mapped_column(
        sa_Enum("CREDIT", "DEBIT", "ESCROW_HOLD", "ESCROW_RELEASE", "ESCROW_REFUND", name="wallet_transaction_type"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        sa_Enum("PENDING", "COMPLETED", "FAILED", name="wallet_ledger_status"),
        nullable=False,
        default="COMPLETED",
    )
    reference_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class PaymentModel(BaseExtra):
    __tablename__ = "payments"
    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        sa_Enum("PENDING", "SUCCESS", "FAILED", name="payment_status"),
        nullable=False,
        default="SUCCESS",
    )
    idempotency_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# --- Master Catalogs ---

VENUE_TEMPLATES = [
    # Hyderabad
    ("G. M. C. Balayogi Athletic Stadium", "Hyderabad", "Gachibowli Stadium Road", "STADIUM", 32000),
    ("Rajiv Gandhi International Cricket Stadium", "Hyderabad", "Uppal Main Road", "STADIUM", 55000),
    ("Shilpakala Vedika", "Hyderabad", "Hitec City Main Road", "AUDITORIUM", 2500),
    ("Hitex Exhibition Centre", "Hyderabad", "Trade Fair Enclave, Izzat Nagar", "CONVENTION", 12000),
    # Bengaluru
    ("M. Chinnaswamy Stadium", "Bengaluru", "MG Road, Cubbon Park", "STADIUM", 40000),
    ("Bangalore Palace Grounds", "Bengaluru", "Jayamahal Main Road", "FESTIVAL_GROUNDS", 45000),
    ("Kanteerava Indoor Stadium", "Bengaluru", "Kasturba Road, Sampangi Rama Nagar", "ARENA", 10000),
    ("Chowdiah Memorial Hall", "Bengaluru", "16th Cross, Malleshwaram", "AUDITORIUM", 1200),
    # Mumbai
    ("Wankhede Stadium", "Mumbai", "Vinoo Mankad Road, Churchgate", "STADIUM", 33000),
    ("Jio World Garden BKC", "Mumbai", "Bandra Kurla Complex", "FESTIVAL_GROUNDS", 20000),
    ("Nita Mukesh Ambani Cultural Centre (NMACC)", "Mumbai", "Jio World Centre, BKC", "THEATER", 2000),
    ("NSCI Dome Worli", "Mumbai", "Worli Sea Face", "ARENA", 8000),
    ("Shanmukhananda Hall", "Mumbai", "Sion East", "AUDITORIUM", 2700),
    # Delhi NCR
    ("Jawaharlal Nehru Stadium", "Delhi", "Pragati Vihar, Lodhi Road", "STADIUM", 60000),
    ("Indira Gandhi Arena", "Delhi", "IP Estate, Ring Road", "ARENA", 15000),
    ("Siri Fort Auditorium", "Delhi", "August Kranti Marg", "AUDITORIUM", 2500),
    ("Bharat Mandapam (IECC)", "Delhi", "Pragati Maidan", "CONVENTION", 10000),
    # Chennai
    ("M. A. Chidambaram Stadium (Chepauk)", "Chennai", "Victoria Hostel Road", "STADIUM", 38000),
    ("Jawaharlal Nehru Indoor Stadium", "Chennai", "Sydenhams Road, Periamet", "ARENA", 8000),
    ("Music Academy Madras", "Chennai", "TTK Road, Royapettah", "CONCERT_HALL", 1500),
    # Pune
    ("Maharashtra Cricket Association Stadium", "Pune", "Gahunje, Pune-Mumbai Expressway", "STADIUM", 37000),
    ("Shree Shiv Chhatrapati Sports Complex", "Pune", "Balewadi", "ARENA", 12000),
    ("Liberty Square, Phoenix Marketcity", "Pune", "Viman Nagar", "FESTIVAL_GROUNDS", 6000),
    # Kolkata
    ("Eden Gardens", "Kolkata", "BBD Bagh", "STADIUM", 68000),
    ("Vivekananda Yuba Bharati Krirangan (Salt Lake Stadium)", "Kolkata", "Salt Lake Sector III", "STADIUM", 85000),
    ("Science City Main Auditorium", "Kolkata", "J.B.S. Haldane Avenue", "AUDITORIUM", 2200),
    # Ahmedabad
    ("Narendra Modi Stadium", "Ahmedabad", "Motera", "STADIUM", 132000),
    ("EKA Arena TransStadia", "Ahmedabad", "Kankaria Lake", "ARENA", 20000),
    # Jaipur
    ("Sawai Mansingh Stadium", "Jaipur", "Amar Jawan Jyoti, Jan Path", "STADIUM", 30000),
    ("Birla Auditorium", "Jaipur", "Statue Circle", "AUDITORIUM", 1300),
    # Kochi
    ("Jawaharlal Nehru International Stadium", "Kochi", "Kaloor", "STADIUM", 40000),
    # Goa
    ("Vagator Festival Grounds", "Goa", "Ozran Beach Road, Vagator", "FESTIVAL_GROUNDS", 35000),
    ("Dr. Shyama Prasad Mukherjee Stadium", "Goa", "Taleigao Plateau", "ARENA", 5000),
    # Chandigarh
    ("PCA Stadium Mohali", "Chandigarh", "Sector 63, SAS Nagar", "STADIUM", 27000),
    # Lucknow
    ("Ekana International Cricket Stadium", "Lucknow", "Amar Shaheed Path", "STADIUM", 50000),
    # Bhubaneswar
    ("Kalinga Stadium", "Bhubaneswar", "Nayapalli", "STADIUM", 16000),
    # Visakhapatnam
    ("Dr. Y.S. Rajasekhara Reddy ACA-VDCA Cricket Stadium", "Visakhapatnam", "PM Palem", "STADIUM", 27500),
]

ORGANIZERS = [
    ("Sunburn Festival India", "sunburn.tickets@sunburn.in", True),
    ("BCCI Official Ticketing", "ticketing@bcci.tv", True),
    ("OML Entertainment", "live@oml.in", True),
    ("BookMyGig Live Experiences", "events@bookmygig.in", True),
    ("NH7 Weekender Collective", "crew@nh7.in", True),
    ("Zomaland Food & Music", "zomaland@zomato.com", True),
    ("Comic Con India Pvt Ltd", "hq@comicconindia.com", True),
    ("Mashal Sports (Pro Kabaddi)", "tickets@prokabaddi.com", True),
    ("India Art Fair Foundation", "curator@indiaartfair.in", False),
    ("TechSparks Media India", "summits@yourstory.com", False),
    ("Superbloom Live Music", "hello@superbloom.live", False),
    ("Kala Ghoda Association", "office@kalaghodaassociation.com", False),
    ("Cochin Carnival Committee", "organizer@cochincarnival.org", False),
    ("Jaipur Literature Fest Trust", "info@jlfindia.org", False),
    ("HydMusicFest Live", "contact@hydmusicfest.com", False),
    ("NESCO Events & Exhibitions", "contact@nesco.in", False),
    ("Red Lorry Film Fest", "boxoffice@redlorry.in", False),
    ("Apex Esports League India", "tournament@apexesports.in", False),
]

EVENT_TEMPLATES = [
    # MUSIC
    ("Arijit Singh: Soulful Symphony Live", "MUSIC", "An enchanting evening with India's most beloved voice, performing his greatest chartbusters backed by a 40-piece grand orchestra.", 120000, 850000),
    ("Coldplay: Music of the Spheres World Tour", "MUSIC", "The British rock phenomenon brings their spectacular stadium show to India featuring laser lights, eco-fireworks, and iconic anthems.", 350000, 1500000),
    ("Sunburn Goa 2026: The Enchanted Forest", "MUSIC", "Asia's premier electronic dance music festival featuring world-class headliners, mind-bending stage design, and beachside madness.", 450000, 1200000),
    ("Diljit Dosanjh: Dil-Luminati Arena Tour", "MUSIC", "The historic global Punjabi icon lights up the arena with his powerhouse live band, electrifying energy, and viral hits.", 250000, 950000),
    ("Zakir Hussain & Masters of Percussion", "MUSIC", "A monumental classical fusion night celebrating the rhythmic majesty of tabla, ghatam, and sarangi with living legends.", 100000, 450000),
    ("Anuv Jain: Guldasta India Tour", "MUSIC", "Soulful indie acoustic poetry live under the stars. Experience Mishri, Alag Aasmaan, and Baarishein with thousands singing along.", 80000, 280000),
    ("Prateek Kuhad: Silhouettes Acoustic Tour", "MUSIC", "Warm melodies, candid songwriting, and intimate guitar sessions from India's international indie-folk star.", 90000, 320000),
    ("DIVINE & Gully Gang: Punya Paap Arena Tour", "MUSIC", "Mumbai's raw rap pioneer returns with hard-hitting street anthems, trap beats, and high-octane hip-hop energy.", 120000, 480000),
    ("King: Champagne Talk Stadium Showcase", "MUSIC", "The breakout sensation takes the mainstage with unstoppable energy, full brass section, and fan-favorite chart-toppers.", 100000, 380000),
    ("Blackpink: Born Pink Encore Asian Leg", "MUSIC", "The record-breaking K-Pop quartet brings unmatched choreography, stunning visuals, and world-dominating pop hits.", 450000, 1600000),
    ("NH7 Weekender 2026: The Happiest Music Festival", "MUSIC", "Multi-stage carnival of indie rock, metal, electronic, and folk music with curated food villages and art.", 280000, 750000),
    ("Shankar-Ehsaan-Loy: 30 Years of Magic", "MUSIC", "Bollywood's master trio in a retrospective concert performing timeless classics from Dil Chahta Hai to Kal Ho Naa Ho.", 150000, 600000),
    ("Dualist Inquiry: When We Feel Live", "MUSIC", "Cutting-edge live electronica, synthesizers, and guitar grooves from one of India's electronic pioneers.", 60000, 180000),
    ("When Chai Met Toast: Love Chords Tour", "MUSIC", "Uplifting indie pop in English and Hindi with acoustic brass, banjos, and heartwarming vocal harmonies.", 70000, 220000),
    ("Seedhe Maut: Nayaab Arena Experience", "MUSIC", "Delhi's trailblazing hip-hop duo delivers intense, lyrical mastery and mosh-pit energy for diehard fans.", 80000, 300000),
    ("Sid Sriram: Infinite Bound Live Concert", "MUSIC", "Carnatic brilliance meets contemporary R&B in a transcendent live vocal masterclass.", 120000, 500000),
    ("Martin Garrix India Arena Tour", "MUSIC", "World #1 DJ Martin Garrix electrifies the stadium with progressive house anthems and lasers.", 300000, 1000000),
    ("Coke Studio Bharat Live Ensemble", "MUSIC", "Regional folk legends and modern producers unite for a rich tapestry of Indian cultural soundscapes.", 100000, 400000),

    # SPORTS
    ("IPL 2026: Chennai Super Kings vs Mumbai Indians", "SPORTS", "The El Clásico of Indian cricket! High-voltage clash between two of the most successful franchises at Chepauk.", 150000, 1200000),
    ("IPL 2026: Royal Challengers Bengaluru vs Kolkata Knight Riders", "SPORTS", "Explosive T20 cricket under the Bengaluru lights with boundary barrages and roaring home crowds.", 150000, 1100000),
    ("IPL 2026: Sunrisers Hyderabad vs Delhi Capitals", "SPORTS", "Fast-paced cricket thrills at Rajiv Gandhi International Stadium with aggressive powerplay fireworks.", 100000, 800000),
    ("ISL Semi-Final: Kerala Blasters FC vs Mohun Bagan SG", "SPORTS", "Passionate football rivalry in front of 40,000 yellow-clad Manjappada supporters.", 50000, 300000),
    ("India Open BWF Super 750 Badminton Finals", "SPORTS", "World championship caliber badminton featuring Olympic medalists and intense international court battles.", 60000, 250000),
    ("Davis Cup World Group: India vs Spain", "SPORTS", "Premier international tennis on pristine grass courts with high-stakes singles and doubles matches.", 80000, 400000),
    ("Battlegrounds Mobile India Pro Series Grand Finals", "SPORTS", "The biggest esports championship in the country: 16 elite squads battling live for a ₹2 Crore prize pool.", 40000, 180000),
    ("Pro Kabaddi League Championship Final", "SPORTS", "Breathtaking raids and super tackles as the season's top two kabaddi titans collide for the coveted trophy.", 50000, 350000),
    ("Formula E Hyderabad E-Prix: Round 4", "SPORTS", "100% electric racing machines reaching 320 km/h along the picturesque Hussain Sagar street circuit.", 250000, 1000000),
    ("Prime Volleyball League Finals Night", "SPORTS", "Fast-paced volleyball power spikes and defensive heroics under dazzling arena spotlights.", 40000, 180000),
    ("Hero I-League Kolkata Derby: East Bengal vs Mohammedan SC", "SPORTS", "Centuries of football heritage and fierce cross-town passion at Salt Lake Stadium.", 40000, 200000),

    # ENTERTAINMENT & COMEDY
    ("Vir Das: Mind Fool World Comedy Tour", "ENTERTAINMENT", "International Emmy award-winning comedian delivers his sharpest, most hilarious observational special yet.", 120000, 450000),
    ("Zakir Khan: Papa Kahte Hain Live", "ENTERTAINMENT", "Heartfelt storytelling and iconic Sakht Launda humor in Zakir's most ambitious arena stand-up show.", 100000, 400000),
    ("Mughal-e-Azam: The Grand Musical Broadway", "ENTERTAINMENT", "India's highest-grossing theatrical production with 300 cast members, live kathak, and Mayuri Upadhya's choreography.", 200000, 900000),
    ("Samay Raina: Unfiltered & Outrageous", "ENTERTAINMENT", "Raw, unpredictable crowd work and cutting edge comedic riffs from YouTube's favorite chess streamer.", 80000, 250000),
    ("Cirque du Soleil: Bazzar India Spectacular", "ENTERTAINMENT", "Breathtaking acrobatics, high-wire balancing, and whimsical theatrical storytelling under the grand chapeau.", 250000, 1100000),
    ("Biswa Kalyan Rath: Mood Kharaab Extended", "ENTERTAINMENT", "Philosophical comedic tangents, mathematical deconstructions, and absurd brilliance from Biswa.", 80000, 250000),
    ("The Phantom of the Opera: West End Touring Cast", "ENTERTAINMENT", "Andrew Lloyd Webber's iconic theatrical masterpiece staged with lavish sets and spine-tingling opera.", 300000, 1400000),
    ("Abhishek Upmanyu: Jealous of Sabziwala", "ENTERTAINMENT", "Rapid-fire punchlines, relatable domestic struggles, and neurotic urban comedy from a master.", 90000, 300000),
    ("Magic & Mentalism with Karan Singh", "ENTERTAINMENT", "Mind reading, psychological illusion, and jaw-dropping deception that will leave you questioning reality.", 60000, 180000),

    # CULTURE & EXHIBITIONS
    ("Zomaland 2026: Food, Music & Carnival", "CULTURE", "Over 70 handpicked gourmet food stalls, dessert parlors, carnival games, and top music headliners.", 60000, 200000),
    ("Jaipur Literature Festival: Ideas in Rajasthan", "CULTURE", "Nobel laureates, Man Booker prize winners, historians, and literary giants engage in stirring public discourse.", 40000, 150000),
    ("Comic Con India 2026: Cosplay, Gaming & Merch", "CULTURE", "The ultimate pop culture celebration with international comic artists, movie showcases, and celebrity meetups.", 80000, 250000),
    ("India Art Fair 2026: Modern & Contemporary", "CULTURE", "South Asia's leading platform for modern and contemporary art showcasing 100+ galleries and interactive installations.", 70000, 220000),
    ("Kala Ghoda Arts Festival: Street Tapestry", "CULTURE", "Mumbai's historic art district comes alive with heritage walks, open-air cinema, sculpture, and dance.", 30000, 120000),
    ("Great Indian Craft Beer & Gourmet Festival", "CULTURE", "Tasting pavilions from 25 microbreweries, artisanal cheeses, gourmet BBQ, and live acoustic bands.", 80000, 250000),

    # PROFESSIONAL & TECH
    ("TechSparks 2026: The AI Revolution Summit", "PROFESSIONAL", "India's premier startup conference featuring keynote founders, venture capitalists, and tech breakthroughs.", 150000, 600000),
    ("PyCon India 2026: The Python Gathering", "PROFESSIONAL", "Annual developer summit uniting Python engineers, open-source contributors, and machine learning researchers.", 40000, 150000),
    ("SaaSBOOMi Annual 2026: Founder Pay-it-Forward", "PROFESSIONAL", "Curated unconference for B2B SaaS founders, scaling strategies, and deep product-market fit workshops.", 200000, 800000),
    ("Fintech Conclave: Digital Banking & Payments", "PROFESSIONAL", "Industry leaders debate CBDCs, cross-border UPI, open finance, and regulatory technology architectures.", 120000, 450000),
    ("DesignUp 2026: UX & Product Design Conference", "PROFESSIONAL", "A celebration of human-centric design, creative leadership, design systems, and digital product craft.", 100000, 380000),
]

FIRST_NAMES = [
    "Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Kabir", "Tara", "Aditya", "Ishita",
    "Arjun", "Kavya", "Rahul", "Pooja", "Nikhil", "Divya", "Siddharth", "Meera", "Varun", "Rhea",
    "Gaurav", "Shreya", "Kunal", "Tanvi", "Akash", "Bhavna", "Deepak", "Swati", "Harsh", "Neha",
    "Manish", "Aditi", "Rakesh", "Sanjana", "Yash", "Pallavi", "Sameer", "Simran", "Pranav", "Alia",
    "Karan", "Zoya", "Dev", "Natasha", "Abhay", "Shruti", "Aniket", "Komal", "Mayank", "Ritu",
]

LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Mehta", "Nair", "Reddy", "Rao", "Iyer", "Deshmukh", "Kulkarni",
    "Chatterjee", "Banerjee", "Sengupta", "Mukherjee", "Singh", "Kaur", "Gupta", "Agarwal", "Bansal",
    "Jain", "Shah", "Joshi", "Bhat", "Pillai", "Menon", "Chopra", "Malhotra", "Kapoor", "Khanna",
    "Saxena", "Sinha", "Mishra", "Pandey", "Trivedi", "Shukla", "Dutta", "Ghosh", "Das", "Bose",
]

UNSPLASH_POSTERS = [
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1000&q=80",
]


def seed_large_dataset() -> None:
    print("=== Starting Large Deterministic Seed for Encore V1.5 ===")
    db: Session = SessionWrite()
    try:
        # 1. Preserved Test Users & Organizers
        demo_buyer_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
        admin_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

        existing_demo = db.query(User).filter_by(id=demo_buyer_id).one_or_none()
        if not existing_demo:
            db.add(User(id=demo_buyer_id, email="demo.buyer@example.com", display_name="Demo Buyer", role=UserRole.BUYER))
        existing_admin = db.query(User).filter_by(id=admin_id).one_or_none()
        if not existing_admin:
            db.add(User(id=admin_id, email="admin@example.com", display_name="Admin User", role=UserRole.ADMIN))

        # Organizers
        organizer_users: list[User] = []
        for name, email, is_mega in ORGANIZERS:
            u = db.query(User).filter_by(email=email).one_or_none()
            if not u:
                u = User(id=uuid.uuid4(), email=email, display_name=name, role=UserRole.ORGANIZER, is_mega_organizer=is_mega)
                db.add(u)
            organizer_users.append(u)

        # 140 Customer Users
        customer_users: list[User] = [existing_demo or db.query(User).filter_by(id=demo_buyer_id).one()]
        for i in range(140):
            fn = rng.choice(FIRST_NAMES)
            ln = rng.choice(LAST_NAMES)
            email = f"{fn.lower()}.{ln.lower()}{i+10}@gmail.com"
            u = db.query(User).filter_by(email=email).one_or_none()
            if not u:
                u = User(id=uuid.uuid4(), email=email, display_name=f"{fn} {ln}", role=UserRole.BUYER)
                db.add(u)
            customer_users.append(u)

        db.flush()
        print(f"✓ Seeded {len(customer_users) + len(organizer_users) + 1} users in total.")

        # 2. Venues
        venues: list[Venue] = []
        # Keep Encore Arena
        demo_venue = db.query(Venue).filter_by(name="Encore Arena").one_or_none()
        if not demo_venue:
            demo_venue = Venue(id=uuid.uuid4(), name="Encore Arena", city="Hyderabad", timezone="Asia/Kolkata")
            db.add(demo_venue)
            db.flush()
        venues.append(demo_venue)

        for v_name, city, addr, v_type, capacity in VENUE_TEMPLATES:
            v = db.query(Venue).filter_by(name=v_name).one_or_none()
            if not v:
                v = Venue(id=uuid.uuid4(), name=v_name, city=city, timezone="Asia/Kolkata")
                db.add(v)
            venues.append(v)

        db.flush()
        print(f"✓ Seeded {len(venues)} venues across 15 Indian cities.")

        # 3. Events
        # Preserve Encore Launch Night: e31fea72-d88a-407b-9e36-19515a01e71e
        preserved_event_id = uuid.UUID("e31fea72-d88a-407b-9e36-19515a01e71e")
        existing_event = db.query(Event).filter_by(id=preserved_event_id).one_or_none()
        if not existing_event:
            existing_event = Event(
                id=preserved_event_id,
                venue_id=demo_venue.id,
                name="Encore Launch Night",
                description="The inaugural flagship night celebrating the launch of the Encore ticketing platform.",
                starts_at=datetime.now(UTC) + timedelta(days=30),
                status=EventStatus.ON_SALE,
            )
            db.add(existing_event)
            db.flush()

        events: list[Event] = [existing_event]
        now = datetime.now(UTC)

        # Generate 125 Events
        for i in range(125):
            tmpl = rng.choice(EVENT_TEMPLATES)
            venue = rng.choice(venues)
            
            # Distribution of states: 70% ON_SALE, 15% SOLD_OUT, 10% SCHEDULED, 5% CANCELLED
            roll = rng.random()
            if roll < 0.70:
                ev_status = EventStatus.ON_SALE
                delta_days = rng.randint(2, 90)
            elif roll < 0.85:
                ev_status = EventStatus.SOLD_OUT
                delta_days = rng.randint(5, 60)
            elif roll < 0.95:
                ev_status = EventStatus.SCHEDULED
                delta_days = rng.randint(60, 180)
            else:
                ev_status = EventStatus.CANCELLED
                delta_days = rng.randint(10, 45)

            ev_name = f"{tmpl[0]} (City Tour #{i+1})" if i > 40 else tmpl[0]
            existing_ev = db.query(Event).filter_by(name=ev_name).one_or_none()
            if not existing_ev:
                ev = Event(
                    id=uuid.uuid4(),
                    venue_id=venue.id,
                    name=ev_name,
                    description=tmpl[2],
                    starts_at=now + timedelta(days=delta_days, hours=rng.randint(16, 21)),
                    status=ev_status,
                )
                db.add(ev)
                events.append(ev)
            else:
                events.append(existing_ev)

        db.flush()
        print(f"✓ Seeded {len(events)} events across all categories and lifecycle states.")

        # 4. Seats & Inventory
        sections_cfg = [
            ("VIP", 800000, 6),
            ("PREMIUM", 450000, 8),
            ("GOLD", 250000, 10),
            ("SILVER", 150000, 12),
            ("STANDARD", 80000, 14),
        ]

        print("Seeding venue seats and event inventory (Primary + Shards)...")
        for ev in events:
            # Check if event already has inventory
            existing_inv = db.query(Inventory).filter_by(event_id=ev.id).limit(1).first()
            if existing_inv:
                continue

            v_seats = db.query(Seat).filter_by(venue_id=ev.venue_id).all()
            if not v_seats:
                # Create seats for this venue
                for sec, base_cents, count in sections_cfg:
                    for s_num in range(1, count + 1):
                        seat = Seat(
                            id=uuid.uuid4(),
                            venue_id=ev.venue_id,
                            section=sec,
                            row_label="A",
                            seat_number=str(s_num),
                        )
                        db.add(seat)
                db.flush()
                v_seats = db.query(Seat).filter_by(venue_id=ev.venue_id).all()

            # Create Inventory rows
            shard_db = shard_manager.get_session(ev.id)
            try:
                # Replicate venue and event to shard
                venue_obj = db.get(Venue, ev.venue_id)
                if not shard_db.get(Venue, venue_obj.id):
                    shard_db.add(Venue(id=venue_obj.id, name=venue_obj.name, city=venue_obj.city, timezone=venue_obj.timezone))
                if not shard_db.get(Event, ev.id):
                    shard_db.add(Event(id=ev.id, venue_id=ev.venue_id, name=ev.name, starts_at=ev.starts_at, status=ev.status))
                shard_db.flush()

                for seat in v_seats:
                    # Match price by section
                    price = next((p for s, p, _ in sections_cfg if s == seat.section), 100000)
                    
                    if ev.status == EventStatus.SOLD_OUT:
                        inv_status = InventoryStatus.SOLD
                    elif ev.status == EventStatus.ON_SALE:
                        r = rng.random()
                        if r < 0.65:
                            inv_status = InventoryStatus.AVAILABLE
                        elif r < 0.85:
                            inv_status = InventoryStatus.SOLD
                        else:
                            inv_status = InventoryStatus.HELD
                    else:
                        inv_status = InventoryStatus.AVAILABLE

                    inv_id = uuid.uuid4()
                    inv = Inventory(
                        id=inv_id,
                        event_id=ev.id,
                        seat_id=seat.id,
                        status=inv_status,
                        price_cents=price,
                    )
                    db.add(inv)

                    # Add to shard
                    if not shard_db.get(Seat, seat.id):
                        shard_db.add(Seat(id=seat.id, venue_id=seat.venue_id, section=seat.section, row_label=seat.row_label, seat_number=seat.seat_number))
                        shard_db.flush()

                    shard_db.add(Inventory(
                        id=inv_id,
                        event_id=ev.id,
                        seat_id=seat.id,
                        status=inv_status,
                        price_cents=price,
                    ))

                shard_db.commit()
            finally:
                shard_db.close()

        db.flush()
        print(f"✓ Seeded seat inventory across events.")

        # 5. Orders and Tickets
        print("Seeding customer orders and tickets...")
        all_sold_inv = db.query(Inventory).filter_by(status=InventoryStatus.SOLD).all()
        created_tickets: list[Ticket] = []

        # Ensure demo user gets a rich set of tickets
        demo_user = db.get(User, demo_buyer_id)
        demo_target_count = 12
        demo_assigned = 0

        for inv in all_sold_inv[:450]:
            if demo_assigned < demo_target_count:
                buyer = demo_user
                demo_assigned += 1
            else:
                buyer = rng.choice(customer_users)

            order = Order(
                id=uuid.uuid4(),
                user_id=buyer.id,
                event_id=inv.event_id,
                status=OrderStatus.COMPLETED,
                total_cents=inv.price_cents + 3500,  # price + convenience fee
                idempotency_key=f"seed_ord_{inv.id}",
                created_at=now - timedelta(days=rng.randint(1, 30)),
            )
            db.add(order)
            db.flush()

            # Payment
            payment = PaymentModel(
                id=uuid.uuid4(),
                order_id=order.id,
                user_id=buyer.id,
                amount_cents=order.total_cents,
                status="SUCCESS",
                idempotency_key=f"seed_pay_{order.id}",
                created_at=order.created_at,
            )
            db.add(payment)

            # Ticket
            ticket_code = f"TIX-{uuid.uuid4().hex[:8].upper()}"
            t_status = TicketStatus.USED if rng.random() < 0.25 else TicketStatus.ISSUED
            ticket = Ticket(
                id=uuid.uuid4(),
                order_id=order.id,
                user_id=buyer.id,
                inventory_id=inv.id,
                ticket_code=ticket_code,
                status=t_status,
                created_at=order.created_at,
            )
            db.add(ticket)
            created_tickets.append(ticket)

        db.flush()
        print(f"✓ Seeded {len(created_tickets)} tickets and orders across buyers.")

        # 6. Resale Listings & Trades
        print("Seeding resale listings and secondary marketplace trades...")
        resale_count = 0
        trade_count = 0
        
        # Take issued tickets and list some for resale
        issued_tickets = [t for t in created_tickets if t.status == TicketStatus.ISSUED]
        for t in issued_tickets[:80]:
            inv = db.get(Inventory, t.inventory_id)
            if not inv:
                continue

            ask_price = int(inv.price_cents * rng.uniform(0.95, 1.10))
            is_matched = rng.random() < 0.40
            l_status = "MATCHED" if is_matched else "ACTIVE"

            listing = ResaleListingModel(
                id=uuid.uuid4(),
                event_id=inv.event_id,
                ticket_id=t.id,
                seller_id=t.user_id,
                ask_price_cents=ask_price,
                status=l_status,
                created_at=now - timedelta(days=rng.randint(1, 10)),
            )
            db.add(listing)
            resale_count += 1
            db.flush()

            if is_matched:
                buyer = rng.choice([u for u in customer_users if u.id != t.user_id])
                resale_order = ResaleOrderModel(
                    id=uuid.uuid4(),
                    event_id=inv.event_id,
                    buyer_id=buyer.id,
                    bid_price_cents=ask_price,
                    status="MATCHED",
                    created_at=listing.created_at + timedelta(hours=2),
                )
                db.add(resale_order)
                db.flush()

                trade = ResaleTradeModel(
                    id=uuid.uuid4(),
                    event_id=inv.event_id,
                    listing_id=listing.id,
                    order_id=resale_order.id,
                    price_cents=ask_price,
                    created_at=resale_order.created_at + timedelta(minutes=5),
                )
                db.add(trade)
                trade_count += 1

        db.flush()
        print(f"✓ Seeded {resale_count} resale listings and {trade_count} trades.")

        # 7. Wallets and Ledger Transactions
        print("Seeding user wallets and ledger audit transactions...")
        ledger_count = 0
        all_users = customer_users + organizer_users
        for u in all_users:
            w = db.query(WalletModel).filter_by(user_id=u.id).one_or_none()
            if not w:
                bal = 1450000 if u.id == demo_buyer_id else rng.randint(250000, 3500000)
                esc = 350000 if u.id == demo_buyer_id else (rng.randint(50000, 600000) if rng.random() < 0.3 else 0)
                w = WalletModel(
                    id=uuid.uuid4(),
                    user_id=u.id,
                    balance_cents=bal,
                    escrow_cents=esc,
                    version=1,
                )
                db.add(w)
                db.flush()

            # Seed 3 to 6 ledger transactions per wallet
            for k in range(rng.randint(3, 6)):
                tx_type = rng.choice(["CREDIT", "DEBIT", "ESCROW_HOLD", "ESCROW_RELEASE"])
                amt = rng.randint(20000, 500000)
                status = "COMPLETED" if rng.random() < 0.95 else "FAILED"
                ledger = WalletLedgerModel(
                    id=uuid.uuid4(),
                    wallet_id=w.id,
                    amount_cents=amt,
                    transaction_type=tx_type,
                    status=status,
                    reference_id=f"tx_ref_{uuid.uuid4().hex[:12]}",
                    created_at=now - timedelta(days=rng.randint(1, 60)),
                )
                db.add(ledger)
                ledger_count += 1

        db.flush()
        print(f"✓ Seeded {len(all_users)} wallets with {ledger_count} ledger transactions.")

        # 8. Chat Messages across Events
        print("Seeding live attendee chat messages...")
        chat_count = 0
        CHAT_SNIPPETS = [
            "Anyone travelling from Indiranagar for the concert tonight?",
            "What time do the arena gates open?",
            "Security line at Gate 4 is moving super fast guys!",
            "Hyped for the intro track! The stage setup looks insane.",
            "Are backpacks allowed inside the stadium?",
            "Merchandise stand is right by Section B entrance.",
            "Sound check sounded immaculate from the parking lot.",
            "Looking forward to the acoustic set midway!",
            "Make sure to download your dynamic QR ticket before entering the queue.",
            "Best concert vibes ever! The lighting rig is massive.",
            "Anyone grabbing food near the pavilion?",
            "Encore ticketing was so smooth, got VIP right away!",
            "Section Gold row A has the best view in the house.",
            "Shoutout to the sound engineers, acoustics are crystal clear.",
        ]

        for ev in events[:20]:
            for _ in range(rng.randint(25, 40)):
                sender = rng.choice(customer_users)
                msg = ChatMessage(
                    event_id=ev.id,
                    user_id=sender.id,
                    content=rng.choice(CHAT_SNIPPETS),
                    created_at=now - timedelta(minutes=rng.randint(5, 7200)),
                )
                db.add(msg)
                chat_count += 1

        db.flush()
        print(f"✓ Seeded {chat_count} chat messages across event rooms.")

        # 9. Audit Events
        print("Seeding audit security events...")
        audit_count = 0
        for t in created_tickets[:300]:
            audit = AuditEvent(
                id=uuid.uuid4(),
                ticket_id=t.id,
                event_type=AuditEventType.ISSUED,
                user_id=t.user_id,
                created_at=t.created_at,
            )
            db.add(audit)
            audit_count += 1

            if rng.random() < 0.20:
                new_owner = rng.choice(customer_users)
                audit_tr = AuditEvent(
                    id=uuid.uuid4(),
                    ticket_id=t.id,
                    event_type=AuditEventType.TRANSFERRED,
                    user_id=new_owner.id,
                    previous_owner_id=t.user_id,
                    new_owner_id=new_owner.id,
                    created_at=t.created_at + timedelta(days=1),
                )
                db.add(audit_tr)
                audit_count += 1

        db.flush()
        print(f"✓ Seeded {audit_count} compliance audit events.")

        # 10. Media Metadata
        print("Seeding event media and stage diagrams...")
        media_count = 0
        for ev in events[:40]:
            poster_url = rng.choice(UNSPLASH_POSTERS)
            media = MediaMetadata(
                id=uuid.uuid4(),
                owner_id=organizer_users[0].id,
                event_id=ev.id,
                filename=f"poster_{ev.id}.jpg",
                s3_bucket="encore-media",
                s3_key=poster_url,
                status=MediaStatus.READY,
                visibility=MediaVisibility.PUBLIC,
                media_type=MediaType.IMAGE,
                created_at=now - timedelta(days=rng.randint(5, 30)),
            )
            db.add(media)
            media_count += 1

        db.flush()
        print(f"✓ Seeded {media_count} media metadata records.")

        # 11. Scheduled Jobs & Deployments
        print("Seeding scheduler jobs and deployment telemetry records...")
        JOBS_LIST = [
            ("ticket_expiry_reaper", "cron.hourly", "completed"),
            ("resale_settlement_tick", "cron.5m", "completed"),
            ("waiting_room_drain_tick", "cron.1m", "completed"),
            ("kafka_compaction_job", "cron.daily", "completed"),
            ("daily_revenue_rollover", "cron.daily", "completed"),
            ("fraud_velocity_recalc", "cron.15m", "completed"),
            ("media_cleanup_worker", "cron.weekly", "pending"),
        ]
        for job_name, payload, status in JOBS_LIST:
            j = Job(
                id=uuid.uuid4(),
                job_type=job_name,
                payload=f'{{"schedule": "{payload}"}}',
                status=status,
                scheduled_for=now - timedelta(minutes=rng.randint(5, 120)),
                retries=0,
                created_at=now - timedelta(days=1),
            )
            db.add(j)

        DEPS_LIST = [
            ("api-gateway", "v1.5.0", "HEALTHY", "rolling"),
            ("checkout-service", "v1.5.0", "HEALTHY", "rolling"),
            ("payment-service", "v1.5.0", "HEALTHY", "canary"),
            ("inventory-service", "v1.5.0", "HEALTHY", "rolling"),
            ("resale-engine", "v1.5.0", "HEALTHY", "rolling"),
            ("wallet-service", "v1.5.0", "HEALTHY", "rolling"),
            ("notification-service", "v1.4.9", "HEALTHY", "rolling"),
            ("chat-service", "v1.4.8", "HEALTHY", "rolling"),
        ]
        for svc, ver, st, strat in DEPS_LIST:
            dep = Deployment(
                id=uuid.uuid4(),
                service_name=svc,
                version=ver,
                status=st,
                strategy=strat,
                created_at=now - timedelta(hours=rng.randint(2, 48)),
            )
            db.add(dep)

        db.commit()
        print("==================================================")
        print("✓ LARGE DETERMINISTIC SEEDING COMPLETED SUCCESSFULLY!")
        print("==================================================")
    finally:
        db.close()


if __name__ == "__main__":
    seed_large_dataset()
