type Mapping = ReadonlyArray<[string, string]>;

export class UnicodeMapper {
  // Primary curated mapping table.
  // (Roughly organized by category for easier maintenance)
private static readonly MAP: Mapping = [
    /* Faces & Mood */
    ['😀','ツ'], ['😃','◠'], ['😄','◡'], ['😁','≧'], ['😆','▽'],
    ['😅','︿'], ['😂','◍'], ['🤣','◍'], ['🙂','｡'], ['☺️','◠'],
    ['😊','◡'], ['😉','ゝ'], ['😌','˘'], ['😍','❤'], ['😘','з'],
    ['😗','з'], ['😙','з'], ['😚','з'], ['😋','ᓏ'], ['😜','゜'],
    ['😝','ᗧ'], ['😛','ᙠ'], ['🤑','$'], ['🤗','ㆅ'], ['🤭','∎'],
    ['🤫','∴'], ['🤔','∵'], ['🤐','∥'], ['😐','—'], ['😑','─'],
    ['😶','□'], ['🙄','◔'], ['😏','¬'], ['😒','﹀'], ['😬','≋'],
    ['🤥','≉'], ['😔','﹖'], ['😕','﹂'], ['🙃','∩'], ['😴','Z'],
    ['😪','…'], ['😮','ö'], ['😯','Ö'], ['😲','⛣'], ['😳','Ꙭ'],
    ['😱','𓂀'], ['😨','ᐛ'], ['😰','ᑒ'], ['😥','﹢'], ['😢','ಥ'],
    ['😭','ಥ'], ['😤','ᕦ'], ['😡','‼'], ['😠','！'], ['🤯','※'],
    ['🤪','◎'], ['😷','▭'], ['🤒','°'], ['🤕','⊓'], ['🤢','≈'],
    ['🤮','∿'], ['🤧','〰'], ['😇','✧'], ['🤠','^'], ['🤓','⌐'],
    ['🫠','∇'],


    /* Cats & Monsters & Skulls */
    ['😺','𓃠'], ['😸','ω'], ['😹','ಥ'], ['😻','❤'], ['😼','¬'],
    ['😽','з'], ['🙀','𓁹'], ['😿','ಥ'], ['😾','≖'],
    ['👻', 'ಔ'], ['👽', '♾'], ['👾', 'ꍤ'], ['🤖', '𝍇'], ['💩', 'ꙮ'],
    ['💀', '☠'], ['☠️', '☠'], ['😈', '⚉'], ['👿', '〠'], ['👹', '〠'], ['👺', '〠'],

    /* Hands & Gestures */
    ['👍', '✓'], ['👎', '✗'], ['👌', '○'], ['✌️', 'V'], ['🤞', 'X'],
    ['🤟', 'Y'], ['🤘', 'ʌ'], ['🤙', '∪'], ['👊', '●'], ['✊', '■'],
    ['👏', '∥'], ['🙏', '∩'], ['🤝', '≡'], ['✍️', '✐'], ['🫶', '∩'],
    ['👉', '→'], ['👈', '←'], ['👆', '↑'], ['👇', '↓'], ['☝️', '↑'],

    /* Hearts & Stars & Symbols */
    ['❤️', '⋆'], ['💛', '⋆'], ['💚', '⋆'], ['💙', '⋆'], ['💜', '⋆'],
    ['🖤', '⋆'], ['🤍', '⋆'], ['🤎', '⋆'], ['❣️', '⋆'], ['💘', '⋆'],
    ['💝', '⋆'], ['💖', '⋄'], ['💗', '⋄'], ['💓', '⋄'], ['💞', '⋄'],
    ['💫', '⋄'], ['✨', '⋄'], ['⭐', '⋆'], ['🌟', '⋆'], ['💥', '∗'],
    ['🔥', '∆'], ['⚡', '↯'], ['💯', ''], ['💢', '‼'], ['❗', '!'],
    ['‼️', '!!'], ['❓', '?'], ['❕', '!'], ['❔', '?'], ['⁉️', '!?'],
    ['⭕', '◯'], ['✅', '✓'], ['☑️', '☑'], ['✔️', '✓'], ['❌', '×'],
    ['➕', '+'], ['➖', '−'], ['➗', '÷'], ['➰', '◌'], ['➿', 'ထ'],
    ['✳️', '*'], ['✴️', '*'], ['™️', '™'], ['©️', '©'], ['®️', '®'],
    ['〽️', '〽'], ['▪️', '■'], ['▫️', '□'], ['◾', '■'], ['◽', '□'],
    ['◼️', '■'], ['◻️', '□'], ['◯', '◯'], ['⬛', '█'], ['⬜', '░'],
    ['🔴', '●'], ['🟠', '●'], ['🟡', '●'], ['🟢', '●'], ['🔵', '●'],
    ['🟣', '●'], ['⚫', '●'], ['⚪', '○'],

    /* Weather & Nature */
    ['☀️', '⊙'], ['🌤️', '⊙'], ['⛅', '≋'], ['☁️', '≋'], ['🌧️', '≋'],
    ['⛈️', '↯'], ['🌩️', '↯'], ['🌪️', '⊗'], ['🌫️', '≈'], ['🌨️', '✱'],
    ['❄️', '✱'], ['☃️', '⧈'], ['☔', 'Y'], ['💧', '﹢'], ['💦', '﹢'],
    ['🌈', '~'], ['🌙', '◑'], ['🌝', '◕'], ['🌞', '◕'], ['🌚', '◑'],
    ['🌑', '●'], ['🌓', '◐'], ['🌗', '◑'], ['🌕', '○'], ['🌖', '◓'],
    ['🌔', '◒'], ['🌒', '◓'], ['🌘', '◒'], ['⭐️', '⋆'],

    /* Animals — swap many to zodiac/chess/math/latin to avoid CJK */
    ['🦁','𓃭'], ['🐮','𓃾'], ['🐂','𓃗'], ['🐄','𓃾'], ['🐏','𓃵'], ['🐐','𓃶'],
    ['🐴','♞'], ['🦄','𐂃'], ['🦀','♋'], ['🐟','𓆟'], ['🐠','𓆝'], ['🐡','𓆞'],
    ['🦂','𐂥'], ['🐍','ສ'], ['🐢','𓆉'], ['🐦','𓅃'], ['🐧','𓅱'],
    ['🕊️','𓅃'], ['🐶','ʘ'], ['🐺','Λ'], ['🐱','𓃠'], ['🐭','°'],
    ['🐹','°'], ['🐰','𓃹'], ['🐻','ᴥ'], ['🐼','ᴥ'], ['🐨','ᵜ'],
    ['🐯','𓃭'], ['🐷','¤'], ['🐸','𓆈'], ['🐵','𓃻'], ['🐔','𓅫'],

    /* Food & Drink (geometric & symbols) */
    ['🍎', '◍'], ['🍏', '◍'], ['🍐', '◍'], ['🍊', '◍'], ['🍋', '◍'],
    ['🍌', '∪'], ['🍉', '◙'], ['🍇', '◙'], ['🍓', '◈'], ['🍒', '◈'],
    ['🍑', '◖'], ['🍍', '✳'], ['🥭', '◍'], ['🥥', '◌'], ['🥝', '◍'],
    ['🍅', '◍'], ['🥔', '○'], ['🥕', '∧'], ['🌽', '≡'], ['🥒', '丨'],
    ['🥬', '≀'], ['🥦', '≀'], ['🧄', '≀'], ['🧅', '≀'], ['🍞', '▭'],
    ['🥐', '∩'], ['🥖', '丨'], ['🥯', '◯'], ['🥞', '≡'], ['🧇', '▒'],
    ['🧀', '▭'], ['🍗', '∩'], ['🍖', '⊓'], ['🍔', '▣'], ['🍟', '≡'],
    ['🍕', '△'], ['🌭', '⊔'], ['🥪', '▭'], ['🌮', '◠'], ['🌯', '◧'],
    ['🍜', '〼'], ['🍣', '〓'], ['🍤', 'つ'], ['🍙', '◉'], ['🍚', '◌'],
    ['🍘', '◍'], ['🍥', '◎'], ['🍡', '●'], ['🍧', '∧'], ['🍨', '∩'],
    ['🍩', '◯'], ['🍪', '◌'], ['🍫', '▦'], ['🍬', '◇'], ['🍭', '◍'],
    ['🍮', '▤'], ['🍯', '∵'], ['🍼', '¡'], ['☕', '𐃴'], ['🍵', '⛾'],
    ['🍺', '!'], ['🍻', '‼'], ['🥂', '‼'], ['🍷', '𐃯'], ['🍸', '𐃮'], ['🍹', 'Y'],

    /* Activities & Objects */
    ['⚽', '○'], ['🏀', '◯'], ['🏈', '◉'], ['⚾', '◍'], ['🎾', '◌'],
    ['🏐', '◯'], ['🏉', '◉'], ['🎱', '●'], ['🏓', '◌'], ['🏸', 'Y'],
    ['🥊', '▣'], ['🥋', '凸'], ['🎽', '𐁇'], ['🛹', '▭'], ['⛳', '†'],
    ['🎣', 'J'], ['🎳', '◎'], ['🎯', '⊕'], ['🎮', '☐'], ['🎰', '≡'], ['🎲', '■'],
    ['🧩', '▣'], ['♟️', '♟'], ['🎺', 'J'], ['🎷', 'J'], ['🎸', 'ʃ'], ['🎻', 'ʃ'],
    ['🎹', '♮'], ['🎼', '♩'], ['🎵', '♪'], ['🎶', '♫'], ['🎤', '†'],

    /* Travel & Places (no swastikas; symbolic alternates) */
    ['🚗', '▣'], ['🚕', '▣'], ['🚙', '▣'], ['🚌', '▤'], ['🚎', '▤'],
    ['🏎️', '▣'], ['🚓', '▣'], ['🚑', '▣'], ['🚒', '▣'], ['🚐', '▤'],
    ['🚚', '▤'], ['🚛', '▤'], ['🚜', '▤'], ['🛴', '▭'], ['🚲', '⊂'],
    ['🛵', '⊂'], ['🏍️', '⊂'], ['🚨', '!'], ['🚥', '∴'], ['🚦', '∴'],
    ['🚧', '∎'], ['⛽', '⟟'], ['🚏', '⊓'], ['🗺️', '▦'], ['🗿', '■'],
    ['🗼', '†'], ['🗽', '¶'], ['⛩️', '⛩'], ['⛲', '≋'], ['🏰', '♜'],
    ['🏯', '♜'], ['🏠', '⌂'], ['🏡', '⌂'], ['🏢', 'ʭ'], ['🏣', '〒'],
    ['🏤', '⛫'], ['🏥', '✚'], ['🏦', '¤'], ['🏫', '∑'], ['🏪', '▥'],
    ['🏬', '▥'], ['🏭', '⚙'], ['🏛️', '∏'], ['⛪', '†'], ['🕌', '☪'],
    ['🕍', '✡'], ['🕋', '□'], ['🛕', 'ॐ'], ['⛺', '△'],

    /* Tools & UI Symbols */
    ['🔍', '⊕'], ['🔎', '⊖'], ['🔧', '⊩'], ['🔨', '⊢'], ['🪓', '⊣'],
    ['⛏️', '⊡'], ['⚒️', '⊤'], ['🛠️', '⊥'], ['🗡️', '†'], ['⚔️', '‡'],
    ['🏹', '↤'], ['🛡️', '⟐'], ['🔗', '∽'], ['⛓️', '∿'], ['⚙️', '⚙'], ['🧭', '✚'],
    ['⏰', '⏰'], ['⏱️', '⏱'], ['⏲️', '⏲'], ['⏳', '⌛'], ['⌛', '⌛'],
    ['⌚', '⌚'], ['🔒', '⊘'], ['🔓', '⊖'], ['🔑', 'ϟ'], ['🗝️', 'ϟ'],
    ['✉️', '≜'], ['📩', '≜'], ['📧', '@'], ['📞', 'T'], ['☎️', 'T'],
    ['📱', '▥'], ['💻', '▦'], ['⌨️', '⌨'], ['🖱️', '•'], ['🖲️', '•'],
    ['💽', '◧'], ['💾', '▨'], ['💿', '◎'], ['📀', '◎'], ['🖨️', '▦'],
    ['🖥️', '▦'], ['🗂️', '≣'], ['🗃️', '≣'], ['🗄️', '≣'],
    ['📂', '≣'], ['📁', '≣'], ['📝', '≔'], ['✏️', '✐'], ['✒️', '✎'],
    ['🖊️', '✎'], ['🖋️', '✎'], ['🖌️', '丿'], ['🖍️', '∕'], ['📌', '†'],
    ['📍', '•'], ['📎', '∪'], ['🖇️', '∩'], ['📐', '∠'], ['📏', '—'],

    /* People silhouettes → Egyptian man (generic pictograph) */
    ['👤', '𓀀'], ['👥', '𓀀'],

    /* Numbers & Keycaps */
    ['0️⃣', '0'], ['1️⃣', '1'], ['2️⃣', '2'], ['3️⃣', '3'], ['4️⃣', '4'],
    ['5️⃣', '5'], ['6️⃣', '6'], ['7️⃣', '7'], ['8️⃣', '8'], ['9️⃣', '9'],
    ['🔟', '10'],

    /* Simple ZWJ sequences (collapsed) */
    ['👨‍👩‍👧‍👦', '≡'], ['👨‍👩‍👧', '≡'], ['👩‍👩‍👧‍👦', '≡'], ['👨‍👨‍👧‍👦', '≡'],
  ] as const;

  // Variation Selectors and Modifiers we strip before replacement.
  private static readonly STRIP_REGEX = /[\uFE0E\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]/gu;

  // Keycap combining character: turn "1\u20E3" into "1" etc.
  private static readonly KEYCAP_REGEX = /([0-9#*])\uFE0F?\u20E3/gu;

  // Build the internal map at load time, expanding with stripped variants.
  private static buildMap(): Map<string, string> {
    const m = new Map<string, string>();

    // Add base entries and their FE0F-stripped forms.
    for (const [src, dst] of this.MAP) {
      // Enforce that dst is outside popular emoji planes via simple range checks.
      // (Not exhaustive, but helps catch common mistakes.)
      const cp = dst.codePointAt(0)!;
      const isLikelyEmojiTarget =
        (cp >= 0x1F300 && cp <= 0x1FFFF) ||   // Most emoji blocks
        (cp >= 0x2600 && cp <= 0x27BF);       // Misc Symbols & Dingbats (some render as emoji)
      if (isLikelyEmojiTarget) {
        // If something slips in, silently coerce a safe fallback.
        // You can override individually later if desired.
        m.set(src, '?');
        m.set(UnicodeMapper.stripEmojiModifiers(src), '?');
        continue;
      }

      m.set(src, dst);
      const stripped = UnicodeMapper.stripEmojiModifiers(src);
      if (stripped !== src) m.set(stripped, dst);
    }
    return m;
  }

  private static readonly emojiMap: Map<string, string> = UnicodeMapper.buildMap();

  /** Remove variation selectors, ZWJ, and skin tones */
  private static stripEmojiModifiers(s: string): string {
    return s.replace(UnicodeMapper.STRIP_REGEX, '');
  }

  static convertEmoji(emoji: string): string {
    return this.emojiMap.get(emoji) || emoji;
  }

  /** Convert text containing emojis to Unicode equivalents */
  static convertText(text: string): string {
    if (!text) return text;

    // Normalize keycaps and strip modifiers for easier matching
    let t = text.replace(this.KEYCAP_REGEX, '$1');
    t = t.replace(this.STRIP_REGEX, '');

    // Fast path: replace all mapped emojis via split/join (avoids regex pitfalls)
    for (const [emoji, unicode] of this.emojiMap.entries()) {
      if (!emoji) continue;
      if (t.includes(emoji)) {
        t = t.split(emoji).join(unicode);
      }
    }
    return t;
  }
  

  /** Check if character (emoji) has a mapping */
  static hasMappingFor(character: string): boolean {
    const stripped = this.stripEmojiModifiers(character);
    return this.emojiMap.has(character) || this.emojiMap.has(stripped);
  }

  /** Simple coverage report for a string: which emojis were mapped, which were missed */
  static coverageReport(text: string): { mapped: Set<string>; missed: Set<string> } {
    const mapped = new Set<string>();
    const missed = new Set<string>();

    // Extract code points; naive emoji segmentation is OK for reporting
    for (const ch of Array.from(text)) {
      const stripped = this.stripEmojiModifiers(ch);
      if (this.emojiMap.has(ch) || this.emojiMap.has(stripped)) {
        mapped.add(ch);
      } else if (/\p{Extended_Pictographic}/u.test(ch)) {
        missed.add(ch);
      }
    }
    return { mapped, missed };
  }
}