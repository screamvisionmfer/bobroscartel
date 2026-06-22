"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useScroll, useSpring, useTransform, type MotionStyle, type PanInfo, type Variants } from "framer-motion";
import SiteHeader from "../components/SiteHeader";

const mintUrl = "https://launchmynft.io/mint/bobroscartel";

const stats = [
  {
    value: "2,222",
    label: "BOBROS SUPPLY",
    text: "A tight club, not an endless crowd.",
  },
  {
    value: "HAND-DRAWN",
    label: "PAPER CUT VIBE",
    text: "Cartoon chaos, rough edges, clean identity.",
  },
  {
    value: "MEME-FIRST",
    label: "BUILT FOR CULTURE",
    text: "Made for posts, pfps, raids and inside jokes.",
  },
  {
    value: "NO PROMISES",
    label: "GOOD VIBES ONLY",
    text: "No corporate roadmap. No fake utility. Just BOBROS.",
  },
];

type NftTrait = {
  trait_type?: string;
  value?: string | number | boolean;
};

type NftMetadata = {
  name?: string;
  attributes?: NftTrait[];
};

const nftIds = [
  1609, 1610, 1611, 1612, 1613, 1614, 1615, 1616, 1617, 1618, 1619, 1620, 1621, 1622, 1623, 1624, 1625, 1626,
] as const;

const nftCardClasses = ["card-purple", "card-green", "card-yellow", "card-red", "card-blue", "card-cream"];

const nftItems = nftIds.map((id) => ({
  id,
  image: `/nfts/nft_${id}.png`,
  metadata: `/nfts/nft_${id}.json`,
}));

const cardSlots = Array.from({ length: 6 }, (_, index) => ({
  slotIndex: index,
  className: nftCardClasses[index % nftCardClasses.length] ?? "card-yellow",
}));

const preferredTraitTypes = ["Background", "Bobo Type", "Eyes", "Clothes", "Head", "Mouth"];

function positiveModulo(value: number, length: number) {
  return ((value % length) + length) % length;
}

function pickDisplayTraits(metadata: NftMetadata | null | undefined) {
  const traits = metadata?.attributes ?? [];
  const pickedTraits = preferredTraitTypes
    .map((traitType) => traits.find((trait) => trait.trait_type === traitType))
    .filter((trait): trait is NftTrait => Boolean(trait));

  const pickedNames = new Set(pickedTraits.map((trait) => trait.trait_type));
  const fallbackTraits = traits.filter((trait) => !pickedNames.has(trait.trait_type));

  return [...pickedTraits, ...fallbackTraits].slice(0, 6);
}

const contractAddress = "4nV5gNwwP68zUDat26ySChREqVaQaLudfJBkSgEzpump";
const bobrosContractAddress = "CmWqeLBxd1vqTSyp3mumWdhRAVsLYKV8KPHsAjjTpump";
const buyUrl =
  "https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=4nV5gNwwP68zUDat26ySChREqVaQaLudfJBkSgEzpump";
const billboardMessage = "WELCOME TO\nTHE CLUB, BOBUDDY!";
const themeStorageKey = "bobros-theme";
type ThemeMode = "day" | "night";

const preloaderLines = [
  "CONNECTING TO BOBROS CARTEL...",
  "CHECKING WALLET BALANCE...",
  "CALCULATING FUTURE BILLIONS...",
  "PRINTING FAKE ROADMAP...",
  "ACCESS GRANTED",
];

const revealEase = [0.22, 1, 0.36, 1] as const;

const heroCloudReveal: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.9 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay,
      duration: 0.72,
      ease: revealEase,
    },
  }),
};

const sectionReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 42,
    filter: "blur(8px)",
    transition: {
      duration: 0.45,
      ease: revealEase,
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.7,
      ease: revealEase,
    },
  },
};

const staggerParent: Variants = {
  hidden: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 28,
    scale: 0.96,
    filter: "blur(6px)",
    transition: {
      duration: 0.38,
      ease: revealEase,
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.55,
      ease: revealEase,
    },
  },
};

function Preloader() {
  return (
    <motion.div
      className="preloader"
      initial={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 1.035, filter: "blur(12px)" }}
      transition={{ duration: 0.45, ease: revealEase }}
      aria-label="BOBROS loading sequence"
      role="status"
    >
      <div className="preloader-panel">
        <img className="preloader-logo" src="/assets/logo.png" alt="BOBROS Cartel" />

        <div className="preloader-lines" aria-live="polite">
          {preloaderLines.map((line, index) => (
            <span className="preloader-line" style={{ "--line-delay": `${index * 0.33}s` } as CSSProperties} key={line}>
              <span className="preloader-prompt">&gt;</span>
              {line}
            </span>
          ))}
        </div>

        <div className="preloader-bar" aria-hidden="true">
          <span className="preloader-bar-fill" />
        </div>

        <div className="preloader-stamp">FUTURE BILLIONAIRE DETECTED</div>
      </div>
    </motion.div>
  );
}

function Billboard({ style }: { style?: MotionStyle } = {}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let index = 0;
    let deleting = false;
    let timeoutId: number | undefined;

    setTyped("");

    const tick = () => {
      if (!deleting) {
        index += 1;
        setTyped(billboardMessage.slice(0, index));

        if (index >= billboardMessage.length) {
          deleting = true;
          timeoutId = window.setTimeout(tick, 1800);
          return;
        }
      } else {
        index -= 1;
        setTyped(billboardMessage.slice(0, index));

        if (index <= 0) {
          deleting = false;
          timeoutId = window.setTimeout(tick, 500);
          return;
        }
      }

      timeoutId = window.setTimeout(tick, deleting ? 28 : 45);
    };

    timeoutId = window.setTimeout(tick, 350);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  const typedLines = useMemo(() => typed.split("\n"), [typed]);

  return (
    <motion.div className="billboard-shell" variants={cardReveal} style={style}>
      <img className="billboard-image" src="/assets/billboard.png" alt="BOBROS billboard" />

      <div className="billboard-lights" aria-hidden="true">
        <span className="billboard-lamp-glow billboard-lamp-glow-left" />
        <span className="billboard-lamp-glow billboard-lamp-glow-right" />
        <span className="billboard-light-spill" />
      </div>

      <div className="billboard-title-zone" aria-live="polite">
        {typedLines.map((line, index) => (
          <span key={`${line}-${index}`}>{line || "\u00A0"}</span>
        ))}
      </div>

      <div className="billboard-button-zone">
        <a className="billboard-button" href={mintUrl} target="_blank" rel="noopener noreferrer">
          <span>MINT YOUR BOBRO NOW!</span>
        </a>
      </div>
    </motion.div>
  );
}

function AtmInteractive({ style }: { style?: MotionStyle } = {}) {
  const [copied, setCopied] = useState(false);
  const shortContract = `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <motion.div className="atm-wrap" id="token" variants={cardReveal} style={style}>
      <img className="atm-image" src="/assets/atm-shell.png" alt="BOBO ATM" />

      <div className="atm-top-label" aria-hidden="true">BOBO ATM</div>

      <div className="atm-screen-overlay">
        <div className="atm-screen-content">
          <img className="atm-crt-art" src="/assets/bobocrt.png" alt="" aria-hidden="true" draggable={false} />

          <div className="atm-socials">
            <a className="atm-screen-link" href="https://t.me/bobocouncil" target="_blank" rel="noopener noreferrer">
              BOBOCOUNCIL TG
            </a>
            <a className="atm-screen-link" href="https://x.com/bobocouncil" target="_blank" rel="noopener noreferrer">
              BOBOCOUNCIL X
            </a>
            <a className="atm-screen-link" href="https://www.bobothebear.io/" target="_blank" rel="noopener noreferrer">
              WEBSITE $BOBO
            </a>
          </div>

          <div className="atm-contract-block">
            <span className="atm-contract-label">CONTRACT</span>
            <div className="atm-contract-row">
              <strong className="atm-contract-address">{shortContract}</strong>
              <button type="button" className="copy-contract" onClick={handleCopy}>
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="atm-button-overlay">
        <a className="atm-real-button" href={buyUrl} target="_blank" rel="noopener noreferrer">
          BUY $BOBO
        </a>
      </div>
    </motion.div>
  );
}

function ContractAddressSection() {
  const [copied, setCopied] = useState(false);
  const copyResetTimeout = useRef<number | undefined>(undefined);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bobrosContractAddress);
      setCopied(true);

      if (copyResetTimeout.current) window.clearTimeout(copyResetTimeout.current);
      copyResetTimeout.current = window.setTimeout(() => {
        setCopied(false);
        copyResetTimeout.current = undefined;
      }, 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleAddressKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleCopy();
  };

  useEffect(() => {
    return () => {
      if (copyResetTimeout.current) window.clearTimeout(copyResetTimeout.current);
    };
  }, []);

  return (
    <motion.section
      className="contract-section shell"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.35 }}
      variants={sectionReveal}
    >
      <div className="contract-card">
        <div className="contract-copy">
          <span className="contract-title">$BOBROS CA</span>
          <div className="contract-address-line">
            <span className="contract-token-icon" aria-hidden="true">
              <span>$B</span>
            </span>
            <span
              className="contract-address-value"
              role="button"
              tabIndex={0}
              title="Copy contract address"
              onClick={handleCopy}
              onKeyDown={handleAddressKeyDown}
            >
              {bobrosContractAddress}
            </span>
          </div>
        </div>

        <button className="contract-copy-button" type="button" onClick={handleCopy}>
          {copied ? "COPIED!" : "COPY CA"}
        </button>
      </div>
    </motion.section>
  );
}

function CollectionDrum() {
  const angleStep = 360 / cardSlots.length;
  const rotation = useMotionValue(0);
  const smoothRotation = useSpring(rotation, { stiffness: 90, damping: 18, mass: 0.7 });
  const [activeIndex, setActiveIndex] = useState(0);
  const [baseIndex, setBaseIndex] = useState(0);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [nftMetadataById, setNftMetadataById] = useState<Record<number, NftMetadata | null | undefined>>({});
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const resumeAutoplayTimeout = useRef<number | undefined>(undefined);
  const lastSnappedStep = useRef(0);

  const getNftForSlot = (slotIndex: number) => {
    const rawOffset = positiveModulo(slotIndex - activeIndex, cardSlots.length);
    const centeredOffset = rawOffset > cardSlots.length / 2 ? rawOffset - cardSlots.length : rawOffset;
    return nftItems[positiveModulo(baseIndex + centeredOffset, nftItems.length)];
  };

  const activeCard = getNftForSlot(activeIndex);
  const activeMetadata = nftMetadataById[activeCard.id];
  const activeTraits = pickDisplayTraits(activeMetadata);

  const syncActiveCard = (value: number) => {
    const snappedStep = Math.round(value / angleStep);
    const stepDelta = snappedStep - lastSnappedStep.current;
    const nextIndex = positiveModulo(-snappedStep, cardSlots.length);

    if (stepDelta !== 0) {
      setBaseIndex((current) => positiveModulo(current - stepDelta, nftItems.length));
      lastSnappedStep.current = snappedStep;
    }

    setActiveIndex(nextIndex);
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    rotation.set(rotation.get() + info.delta.x * 0.18);
  };

  const handleDragStart = () => {
    setIsAutoplayPaused(true);
    if (resumeAutoplayTimeout.current) {
      window.clearTimeout(resumeAutoplayTimeout.current);
      resumeAutoplayTimeout.current = undefined;
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const projected = rotation.get() + info.velocity.x * 0.045;
    const snapped = Math.round(projected / angleStep) * angleStep;
    syncActiveCard(snapped);
    animate(rotation, snapped, {
      type: "spring",
      stiffness: 90,
      damping: 18,
      mass: 0.7,
    });

    resumeAutoplayTimeout.current = window.setTimeout(() => {
      setIsAutoplayPaused(false);
      resumeAutoplayTimeout.current = undefined;
    }, 5200);
  };

  useEffect(() => {
    if (isAutoplayPaused) return undefined;

    const intervalId = window.setInterval(() => {
      const current = rotation.get();
      const snappedCurrent = Math.round(current / angleStep) * angleStep;
      const next = snappedCurrent - angleStep;

      syncActiveCard(next);
      animate(rotation, next, {
        type: "spring",
        stiffness: 90,
        damping: 18,
        mass: 0.7,
      });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [angleStep, isAutoplayPaused, rotation]);

  useEffect(() => {
    return () => {
      if (resumeAutoplayTimeout.current) window.clearTimeout(resumeAutoplayTimeout.current);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadMetadata = async () => {
      const entries = await Promise.all(
        nftItems.map(async (item): Promise<[number, NftMetadata | null]> => {
          try {
            const response = await fetch(item.metadata);
            if (!response.ok) return [item.id, null];

            const metadata = (await response.json()) as NftMetadata;
            return [item.id, metadata];
          } catch {
            return [item.id, null];
          }
        }),
      );

      if (isCancelled) return;

      const nextMetadata: Record<number, NftMetadata | null> = {};
      entries.forEach(([id, metadata]) => {
        nextMetadata[id] = metadata;
      });
      setNftMetadataById(nextMetadata);
    };

    loadMetadata();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="collection-showcase">
      <div className="collection-drum" aria-label="Draggable BOBROS collection carousel">
        <motion.div
          className="drum-stage"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.08}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          style={{ rotateY: smoothRotation }}
        >
          {cardSlots.map((slot) => {
            const angle = slot.slotIndex * angleStep;
            const card = getNftForSlot(slot.slotIndex);
            const metadata = nftMetadataById[card.id];
            const displayTraits = pickDisplayTraits(metadata);
            const isHovered = hoveredSlot === slot.slotIndex;

            return (
              <article
                key={slot.slotIndex}
                className={`drum-card ${slot.className}${activeIndex === slot.slotIndex ? " is-active" : ""}${isHovered ? " is-hovered" : ""}`}
                style={{ transform: `rotateY(${angle}deg) translateZ(var(--drum-radius))` }}
                tabIndex={0}
                onMouseEnter={() => setHoveredSlot(slot.slotIndex)}
                onMouseLeave={() => setHoveredSlot(null)}
                onFocus={() => setHoveredSlot(slot.slotIndex)}
                onBlur={() => setHoveredSlot(null)}
              >
                <div className="drum-card-inner">
                  <span className="card-id">#{card.id}</span>
                  <img src={card.image} alt={`BOBRO #${card.id}`} className="card-nft-image" draggable={false} />

                  <div className="nft-hover-popover" aria-hidden={!isHovered}>
                    <strong className="nft-hover-title">BOBRO #{card.id}</strong>
                    <div className="nft-hover-traits">
                      {metadata === undefined ? (
                        <p className="nft-hover-empty">Traits loading...</p>
                      ) : displayTraits.length > 0 ? (
                        displayTraits.map((trait, index) => (
                          <div className="nft-hover-row" key={`${card.id}-${trait.trait_type ?? "Trait"}-${index}`}>
                            <span>{trait.trait_type ?? "Trait"}:</span>
                            <strong>{String(trait.value ?? "Unknown")}</strong>
                          </div>
                        ))
                      ) : (
                        <p className="nft-hover-empty">No traits found</p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </motion.div>
        <div className="drum-floor" aria-hidden="true" />
      </div>

      <aside className="nft-mobile-popover" aria-live="polite">
        <strong className="nft-hover-title">BOBRO #{activeCard.id}</strong>
        <div className="nft-hover-traits">
          {activeMetadata === undefined ? (
            <p className="nft-hover-empty">Traits loading...</p>
          ) : activeTraits.length > 0 ? (
            activeTraits.map((trait, index) => (
              <div className="nft-hover-row" key={`active-${activeCard.id}-${trait.trait_type ?? "Trait"}-${index}`}>
                <span>{trait.trait_type ?? "Trait"}:</span>
                <strong>{String(trait.value ?? "Unknown")}</strong>
              </div>
            ))
          ) : (
            <p className="nft-hover-empty">No traits found</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function HeroScene() {
  const heroMouseX = useMotionValue(0);
  const heroMouseY = useMotionValue(0);
  const mx = useSpring(heroMouseX, { stiffness: 110, damping: 24, mass: 0.35 });
  const my = useSpring(heroMouseY, { stiffness: 110, damping: 24, mass: 0.35 });

  // Global scrollY is intentional: effects start immediately, not only after the block is half gone.
  const { scrollY } = useScroll();
  const scroll = useSpring(scrollY, { stiffness: 95, damping: 26, mass: 0.45 });
  const cloudScroll = useSpring(scrollY, { stiffness: 80, damping: 22, mass: 0.5 });

  const titleScale = useTransform(scroll, [0, 70, 300], [1, 0.96, 0.66]);
  const titleOpacity = useTransform(scroll, [0, 95, 285], [1, 0.94, 0]);
  const titleYScroll = useTransform(scroll, [0, 300], [0, -132]);
  const titleXMouse = useTransform(mx, [-0.5, 0.5], [-10, 10]);
  const titleYMouse = useTransform(my, [-0.5, 0.5], [-7, 7]);
  const titleY = useTransform(() => titleYScroll.get() + titleYMouse.get());

  // Starts on the right, moves LEFT on scroll.
  const blimpXScroll = useTransform(scroll, [0, 900], [0, -520]);
  const blimpYScroll = useTransform(scroll, [0, 900], [0, -35]);
  const blimpRotate = useTransform(scroll, [0, 900], [0, -1.2]);
  const blimpXMouse = useTransform(mx, [-0.5, 0.5], [-8, 8]);
  const blimpYMouse = useTransform(my, [-0.5, 0.5], [-5, 5]);
  const blimpX = useTransform(() => blimpXScroll.get() + blimpXMouse.get());
  const blimpY = useTransform(() => blimpYScroll.get() + blimpYMouse.get());

  const planeXMouse = useTransform(mx, [-0.5, 0.5], [-8, 8]);
  const planeYMouse = useTransform(my, [-0.5, 0.5], [-4, 4]);

  const scrollDownOpacity = useTransform(scroll, [0, 95, 210], [1, 0.82, 0]);
  const scrollDownY = useTransform(scroll, [0, 210], [0, 16]);
  const c1mx = useTransform(mx, [-0.5, 0.5], [-14, 14]);
  const c1my = useTransform(my, [-0.5, 0.5], [-6, 6]);
  const c2mx = useTransform(mx, [-0.5, 0.5], [-16, 16]);
  const c2my = useTransform(my, [-0.5, 0.5], [-7, 7]);
  const c3mx = useTransform(mx, [-0.5, 0.5], [-12, 12]);
  const c3my = useTransform(my, [-0.5, 0.5], [-6, 6]);
  const c4mx = useTransform(mx, [-0.5, 0.5], [-12, 12]);
  const c4my = useTransform(my, [-0.5, 0.5], [-6, 6]);
  const c5mx = useTransform(mx, [-0.5, 0.5], [-10, 10]);
  const c5my = useTransform(my, [-0.5, 0.5], [-5, 5]);
  const c6mx = useTransform(mx, [-0.5, 0.5], [-10, 10]);
  const c6my = useTransform(my, [-0.5, 0.5], [-5, 5]);
  const c7mx = useTransform(mx, [-0.5, 0.5], [-11, 11]);
  const c7my = useTransform(my, [-0.5, 0.5], [-5, 5]);
  const c8mx = useTransform(mx, [-0.5, 0.5], [-10, 10]);
  const c8my = useTransform(my, [-0.5, 0.5], [-5, 5]);

  // Cloud scroll motion starts early and moves far enough to be visible.
  const c1xs = useTransform(cloudScroll, [0, 500], [0, -260]);
  const c1ys = useTransform(cloudScroll, [0, 500], [0, -40]);
  const c1s = useTransform(cloudScroll, [0, 500], [1, 1.08]);
  const c1o = useTransform(cloudScroll, [0, 500], [1, 0.72]);
  const c1x = useTransform(() => c1xs.get() + c1mx.get());
  const c1y = useTransform(() => c1ys.get() + c1my.get());

  const c2xs = useTransform(cloudScroll, [0, 500], [0, 300]);
  const c2ys = useTransform(cloudScroll, [0, 500], [0, -30]);
  const c2s = useTransform(cloudScroll, [0, 500], [1, 1.12]);
  const c2o = useTransform(cloudScroll, [0, 500], [1, 0.68]);
  const c2x = useTransform(() => c2xs.get() + c2mx.get());
  const c2y = useTransform(() => c2ys.get() + c2my.get());

  const c3xs = useTransform(cloudScroll, [0, 500], [0, -340]);
  const c3ys = useTransform(cloudScroll, [0, 500], [0, 20]);
  const c3s = useTransform(cloudScroll, [0, 500], [1, 1.06]);
  const c3o = useTransform(cloudScroll, [0, 500], [1, 0.75]);
  const c3x = useTransform(() => c3xs.get() + c3mx.get());
  const c3y = useTransform(() => c3ys.get() + c3my.get());

  const c4xs = useTransform(cloudScroll, [0, 500], [0, 320]);
  const c4ys = useTransform(cloudScroll, [0, 500], [0, -45]);
  const c4s = useTransform(cloudScroll, [0, 500], [1, 1.1]);
  const c4o = useTransform(cloudScroll, [0, 500], [1, 0.7]);
  const c4x = useTransform(() => c4xs.get() + c4mx.get());
  const c4y = useTransform(() => c4ys.get() + c4my.get());

  const c5xs = useTransform(cloudScroll, [0, 500], [0, 180]);
  const c5ys = useTransform(cloudScroll, [0, 500], [0, -25]);
  const c5s = useTransform(cloudScroll, [0, 500], [1, 1.05]);
  const c5o = useTransform(cloudScroll, [0, 500], [1, 0.7]);
  const c5x = useTransform(() => c5xs.get() + c5mx.get());
  const c5y = useTransform(() => c5ys.get() + c5my.get());

  const c6xs = useTransform(cloudScroll, [0, 500], [0, -160]);
  const c6ys = useTransform(cloudScroll, [0, 500], [0, 30]);
  const c6s = useTransform(cloudScroll, [0, 500], [1, 1.08]);
  const c6o = useTransform(cloudScroll, [0, 500], [1, 0.75]);
  const c6x = useTransform(() => c6xs.get() + c6mx.get());
  const c6y = useTransform(() => c6ys.get() + c6my.get());

  const c7xs = useTransform(cloudScroll, [0, 500], [0, 260]);
  const c7ys = useTransform(cloudScroll, [0, 500], [0, 20]);
  const c7s = useTransform(cloudScroll, [0, 500], [1, 1.06]);
  const c7o = useTransform(cloudScroll, [0, 500], [1, 0.72]);
  const c7x = useTransform(() => c7xs.get() + c7mx.get());
  const c7y = useTransform(() => c7ys.get() + c7my.get());

  const c8xs = useTransform(cloudScroll, [0, 500], [0, -220]);
  const c8ys = useTransform(cloudScroll, [0, 500], [0, -20]);
  const c8s = useTransform(cloudScroll, [0, 500], [1, 1.08]);
  const c8o = useTransform(cloudScroll, [0, 500], [1, 0.72]);
  const c8x = useTransform(() => c8xs.get() + c8mx.get());
  const c8y = useTransform(() => c8ys.get() + c8my.get());

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;
    heroMouseX.set(Math.max(-0.5, Math.min(0.5, nx)));
    heroMouseY.set(Math.max(-0.5, Math.min(0.5, ny)));
  };

  const handleMouseLeave = () => {
    heroMouseX.set(0);
    heroMouseY.set(0);
  };

  return (
    <section className="hero" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <motion.div className="cloud cloud-1" aria-hidden="true" custom={0.18} initial="hidden" animate="visible" variants={heroCloudReveal}>
        <motion.img className="cloud-image" src="/assets/cloud.png" alt="" style={{ x: c1x, y: c1y, scale: c1s, opacity: c1o }} />
      </motion.div>
      <motion.div className="cloud cloud-2" aria-hidden="true" custom={0.24} initial="hidden" animate="visible" variants={heroCloudReveal}>
        <motion.img className="cloud-image" src="/assets/cloud.png" alt="" style={{ x: c2x, y: c2y, scale: c2s, opacity: c2o }} />
      </motion.div>
      <motion.div className="cloud cloud-3" aria-hidden="true" custom={0.3} initial="hidden" animate="visible" variants={heroCloudReveal}>
        <motion.img className="cloud-image" src="/assets/cloud.png" alt="" style={{ x: c3x, y: c3y, scale: c3s, opacity: c3o }} />
      </motion.div>
      <motion.div className="cloud cloud-4" aria-hidden="true" custom={0.36} initial="hidden" animate="visible" variants={heroCloudReveal}>
        <motion.img className="cloud-image" src="/assets/cloud.png" alt="" style={{ x: c4x, y: c4y, scale: c4s, opacity: c4o }} />
      </motion.div>
      <motion.div className="cloud cloud-5" aria-hidden="true" custom={0.42} initial="hidden" animate="visible" variants={heroCloudReveal}>
        <motion.img className="cloud-image" src="/assets/cloud.png" alt="" style={{ x: c5x, y: c5y, scale: c5s, opacity: c5o }} />
      </motion.div>
      <motion.div className="cloud cloud-6" aria-hidden="true" custom={0.48} initial="hidden" animate="visible" variants={heroCloudReveal}>
        <motion.img className="cloud-image" src="/assets/cloud.png" alt="" style={{ x: c6x, y: c6y, scale: c6s, opacity: c6o }} />
      </motion.div>
      <motion.div className="cloud cloud-7" aria-hidden="true" custom={0.54} initial="hidden" animate="visible" variants={heroCloudReveal}>
        <motion.img className="cloud-image" src="/assets/cloud.png" alt="" style={{ x: c7x, y: c7y, scale: c7s, opacity: c7o }} />
      </motion.div>
      <motion.div className="cloud cloud-8" aria-hidden="true" custom={0.6} initial="hidden" animate="visible" variants={heroCloudReveal}>
        <motion.img className="cloud-image" src="/assets/cloud.png" alt="" style={{ x: c8x, y: c8y, scale: c8s, opacity: c8o }} />
      </motion.div>

      <motion.div
        className="hero-title-reveal"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.58, duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div className="hero-title-wrap" style={{ scale: titleScale, opacity: titleOpacity, x: titleXMouse, y: titleY }}>
          <img className="hero-title-image" src="/assets/hero-title-tight.png" alt="Billionaire Bobo Club" />
        </motion.div>
      </motion.div>

      <motion.div className="plane-track" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.4 }}>
        <motion.div
          className="plane-runner"
          initial={{ x: "112vw" }}
          animate={{ x: ["112vw", "-48vw"] }}
          transition={{
            delay: 1.2,
            duration: 38,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 1.2,
          }}
        >
          <motion.img
            className="plane-banner-image"
            src="/assets/plane-banner.gif"
            alt="Future billionaires only"
            style={{ x: planeXMouse, y: planeYMouse }}
          />
        </motion.div>
      </motion.div>

      <motion.div
        className="blimp-wrap"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.92, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
        style={{ x: blimpX, y: blimpY, rotate: blimpRotate }}
      >
        <motion.img
          className="blimp-image"
          src="/assets/blimp.png"
          alt="$BOBO blimp"
          animate={{ y: [0, -4, 0], rotate: [0, -0.4, 0] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <motion.div
        className="scroll-down-reveal"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.55, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.a className="scroll-down" href="#about" style={{ opacity: scrollDownOpacity, y: scrollDownY }}>
          <span>SCROLL DOWN</span>
        </motion.a>
      </motion.div>
    </section>
  );
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>("day");
  const [themeReady, setThemeReady] = useState(false);
  const [streetParallaxEnabled, setStreetParallaxEnabled] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const mx = useSpring(mouseX, { stiffness: 120, damping: 22, mass: 0.35 });
  const my = useSpring(mouseY, { stiffness: 120, damping: 22, mass: 0.35 });

  const { scrollY } = useScroll();
  const smoothScroll = useSpring(scrollY, {
    stiffness: 90,
    damping: 24,
    mass: 0.4,
  });

  const logoScrollY = useTransform(smoothScroll, [0, 600], [0, -12]);
  const logoScrollX = useTransform(smoothScroll, [0, 600], [0, -10]);
  const navScrollY = useTransform(smoothScroll, [0, 600], [0, 10]);
  const navScrollX = useTransform(smoothScroll, [0, 600], [0, 14]);
  const logoMouseX = useTransform(mx, [-0.5, 0.5], [-6, 6]);
  const logoMouseY = useTransform(my, [-0.5, 0.5], [-4, 4]);
  const navMouseX = useTransform(mx, [-0.5, 0.5], [-4, 4]);
  const navMouseY = useTransform(my, [-0.5, 0.5], [-3, 3]);

  const logoX = useTransform(() => logoScrollX.get() + logoMouseX.get());
  const logoY = useTransform(() => logoScrollY.get() + logoMouseY.get());
  const navX = useTransform(() => navScrollX.get() + navMouseX.get());
  const navY = useTransform(() => navScrollY.get() + navMouseY.get());
  const streetSkylineX = useTransform(mx, [-0.5, 0.5], [-4, 4]);
  const streetSkylineY = useTransform(my, [-0.5, 0.5], [-2, 2]);
  const streetCloudsX = useTransform(mx, [-0.5, 0.5], [-5, 5]);
  const streetCloudsY = useTransform(my, [-0.5, 0.5], [-2, 2]);
  const streetNatureX = useTransform(mx, [-0.5, 0.5], [-15, 15]);
  const streetNatureY = useTransform(my, [-0.5, 0.5], [-3, 3]);
  const streetCityX = useTransform(mx, [-0.1, 0.1], [-1, 1]);
  const streetCityY = useTransform(my, [-0.1, 0.1], [-1, 1]);
  const billboardX = useTransform(mx, [-0.5, 0.5], [-3, 3]);
  const billboardY = useTransform(my, [-0.5, 0.5], [-3, 3]);
  const atmX = useTransform(mx, [-0.5, 0.5], [2, -2]);
  const atmY = useTransform(my, [-0.5, 0.5], [1, -1]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsLoading(false), 2550);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    if (storedTheme === "day" || storedTheme === "night") {
      setTheme(storedTheme);
    }
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) return;

    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme, themeReady]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: fine) and (min-width: 761px)");
    const syncParallax = () => setStreetParallaxEnabled(mediaQuery.matches);

    syncParallax();
    mediaQuery.addEventListener("change", syncParallax);

    return () => mediaQuery.removeEventListener("change", syncParallax);
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(Math.max(-0.5, Math.min(0.5, nx)));
    mouseY.set(Math.max(-0.5, Math.min(0.5, ny)));
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "night" ? "day" : "night"));
  };

  const streetSkylineStyle = streetParallaxEnabled ? { x: streetSkylineX, y: streetSkylineY } : undefined;
  const streetCloudsStyle = streetParallaxEnabled ? { x: streetCloudsX, y: streetCloudsY } : undefined;
  const streetNatureStyle = streetParallaxEnabled ? { x: streetNatureX, y: streetNatureY } : undefined;
  const streetCityStyle = streetParallaxEnabled ? { x: streetCityX, y: streetCityY } : undefined;
  const billboardStyle = streetParallaxEnabled ? { x: billboardX, y: billboardY } : undefined;
  const atmStyle = streetParallaxEnabled ? { x: atmX, y: atmY } : undefined;

  return (
    <main className={`page-shell theme-${theme}`} data-theme={theme} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <AnimatePresence>{isLoading && <Preloader />}</AnimatePresence>

      <div className="paper-grain" aria-hidden="true" />
      <div className="night-stars" aria-hidden="true" />
      <div className="night-moon" aria-hidden="true" />

      <SiteHeader logoStyle={{ x: logoX, y: logoY }} navStyle={{ x: navX, y: navY }} theme={theme} onThemeToggle={toggleTheme} />

      <HeroScene />

      <ContractAddressSection />

      <motion.section
        className="about-row shell"
        id="about"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.25 }}
      >
        <motion.div className="about-copy card-panel" variants={sectionReveal}>
          <span className="eyebrow">WELCOME TO THE BOBROS</span>
          <h2>UNEMPLOYED DREAM, BILLIONAIRE ENERGY</h2>
          <p>
            2,222 hand-drawn BOBROS living somewhere between broke, blessed and delusional. A meme-first PFP club built
            for timeline chaos, inside jokes and future cult status.
          </p>
          <div className="about-tags" aria-label="BOBROS principles">
            <span>NO ROADMAP</span>
            <span>NO FAKE UTILITY</span>
            <span>JUST BOBROS</span>
          </div>
          <a className="yellow-button" href={mintUrl} target="_blank" rel="noopener noreferrer">
            <span>ENTER THE CLUB</span>
            <strong>→</strong>
          </a>
        </motion.div>

        <motion.div className="stats-grid" variants={staggerParent}>
          {stats.map((stat) => (
            <motion.article className="stat" key={`${stat.value}-${stat.label}`} variants={cardReveal}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
              <p>{stat.text}</p>
            </motion.article>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        className="collection shell"
        id="collection"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.25 }}
        variants={sectionReveal}
      >
        <span className="eyebrow">FUTURE BILLIONAIRES ONLY</span>
        <h2>THE COLLECTION</h2>
        <p>2,222 BOBROS LIVING THE UNEMPLOYED DREAM</p>

        <CollectionDrum />
      </motion.section>

      <motion.section
        className="street-scene"
        id="mint"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
        variants={sectionReveal}
      >
        <div className="street-stage">
          <motion.img
            className="street-skyline-far street-bg-layer"
            src="/assets/skyscrappers.png"
            alt=""
            aria-hidden="true"
            style={streetSkylineStyle}
          />
          <div className="street-window-lights" aria-hidden="true" />

          <motion.div className="lower-clouds" aria-hidden="true" style={streetCloudsStyle}>
            <img className="lower-cloud lower-cloud-1" src="/assets/cloud.png" alt="" />
            <img className="lower-cloud lower-cloud-2" src="/assets/cloud.png" alt="" />
            <img className="lower-cloud lower-cloud-3" src="/assets/cloud.png" alt="" />
            <img className="lower-cloud lower-cloud-4" src="/assets/cloud.png" alt="" />
            <img className="lower-cloud lower-cloud-5" src="/assets/cloud.png" alt="" />
          </motion.div>

          <motion.img className="street-nature-layer street-bg-layer" src="/assets/nature-city.png" alt="" aria-hidden="true" style={streetNatureStyle} />
          <motion.img className="city-image" src="/assets/city.png" alt="" aria-hidden="true" style={streetCityStyle} />

          <motion.div className="street-content shell-wide" variants={staggerParent}>
            <Billboard style={billboardStyle} />
            <motion.a className="mobile-mint-cta" href={mintUrl} target="_blank" rel="noopener noreferrer" aria-label="Mint your Bobro now" variants={cardReveal}>
              <span>Mint your Bobro now</span>
            </motion.a>
            <AtmInteractive style={atmStyle} />
          </motion.div>
        </div>
      </motion.section>

      <footer className="site-footer-scene" id="contact">
        <div className="footer-scene-shell">
          <img className="footer-scene-image" src="/assets/footer.png" alt="" aria-hidden="true" />

          <div className="footer-overlay">
            <div className="footer-link-grid" aria-label="BOBROS footer links">
              <a className="footer-card footer-card-mint" href={mintUrl} target="_blank" rel="noopener noreferrer" aria-label="Mint BOBROS">
                <span>MINT</span>
                <strong>BOBROS</strong>
              </a>

              <a className="footer-card footer-card-buy" href={buyUrl} target="_blank" rel="noopener noreferrer">
                <span>BUY</span>
                <strong>$BOBO</strong>
              </a>

              <a className="footer-card footer-card-dark" href="https://x.com/bobroscartel" target="_blank" rel="noopener noreferrer">
                <span>X /</span>
                <strong>BOBROS</strong>
              </a>

              <a className="footer-card footer-card-founder" href="https://x.com/scream_vision" target="_blank" rel="noopener noreferrer">
                <span>X /</span>
                <strong>FOUNDER</strong>
              </a>
            </div>

            <div className="footer-meta">
              <p>&copy; 2026 Bobros Cartel. All rights reserved.</p>
              <p>
                built by{" "}
                <a href="https://x.com/scream_vision" target="_blank" rel="noopener noreferrer">
                  scream.vision
                </a>
              </p>
              <p>Future billionaires only.</p>
              <p>Not financial advice.</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
