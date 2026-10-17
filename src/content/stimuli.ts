/**
 * Language-neutral picture stimuli. Pictures are system emoji rendered locally
 * (no network). Words live in src/content/<locale>/words.json, keyed by id.
 *
 * Attributes drive the generators: `category` (semantic), `size` relative to a
 * person (for rule-switching tasks), `living` (natural vs artificial).
 */
export type StimulusCategory =
  'animals' | 'food' | 'vehicles' | 'clothing' | 'household' | 'nature' | 'music' | 'sport'

export interface Stimulus {
  id: string
  emoji: string
  category: StimulusCategory
  size: 'big' | 'small'
  living: boolean
  /** Suitable for young children (common, concrete, unambiguous). */
  kid: boolean
}

const s = (
  id: string,
  emoji: string,
  category: StimulusCategory,
  size: 'big' | 'small',
  living: boolean,
  kid = true,
): Stimulus => ({ id, emoji, category, size, living, kid })

export const STIMULI: Stimulus[] = [
  // animals
  s('dog', '🐕', 'animals', 'small', true),
  s('cat', '🐈', 'animals', 'small', true),
  s('elephant', '🐘', 'animals', 'big', true),
  s('mouse', '🐁', 'animals', 'small', true),
  s('horse', '🐎', 'animals', 'big', true),
  s('rabbit', '🐇', 'animals', 'small', true),
  s('cow', '🐄', 'animals', 'big', true),
  s('chick', '🐤', 'animals', 'small', true),
  s('lion', '🦁', 'animals', 'big', true),
  s('frog', '🐸', 'animals', 'small', true),
  s('whale', '🐋', 'animals', 'big', true),
  s('bee', '🐝', 'animals', 'small', true),
  s('bear', '🐻', 'animals', 'big', true),
  s('snail', '🐌', 'animals', 'small', true),
  s('giraffe', '🦒', 'animals', 'big', true),
  s('turtle', '🐢', 'animals', 'small', true),
  s('fish', '🐟', 'animals', 'small', true),
  s('camel', '🐫', 'animals', 'big', true, false),
  // food
  s('apple', '🍎', 'food', 'small', true),
  s('watermelon', '🍉', 'food', 'big', true),
  s('cherry', '🍒', 'food', 'small', true),
  s('pineapple', '🍍', 'food', 'big', true),
  s('grapes', '🍇', 'food', 'small', true),
  s('banana', '🍌', 'food', 'small', true),
  s('strawberry', '🍓', 'food', 'small', true),
  s('pumpkin', '🎃', 'food', 'big', true),
  s('lemon', '🍋', 'food', 'small', true),
  s('bread', '🍞', 'food', 'small', false),
  s('cheese', '🧀', 'food', 'small', false),
  s('carrot', '🥕', 'food', 'small', true),
  s('pear', '🍐', 'food', 'small', true),
  s('cake', '🎂', 'food', 'big', false),
  s('broccoli', '🥦', 'food', 'small', true, false),
  s('pizza', '🍕', 'food', 'big', false),
  // vehicles
  s('car', '🚗', 'vehicles', 'big', false),
  s('bus', '🚌', 'vehicles', 'big', false),
  s('bicycle', '🚲', 'vehicles', 'big', false),
  s('airplane', '✈️', 'vehicles', 'big', false),
  s('ship', '🚢', 'vehicles', 'big', false),
  s('train', '🚆', 'vehicles', 'big', false),
  s('scooter', '🛴', 'vehicles', 'big', false),
  s('truck', '🚚', 'vehicles', 'big', false),
  s('rocket', '🚀', 'vehicles', 'big', false),
  s('helicopter', '🚁', 'vehicles', 'big', false),
  s('tractor', '🚜', 'vehicles', 'big', false),
  s('sailboat', '⛵', 'vehicles', 'big', false),
  // clothing
  s('tshirt', '👕', 'clothing', 'small', false),
  s('jeans', '👖', 'clothing', 'small', false),
  s('dress', '👗', 'clothing', 'small', false),
  s('tophat', '🎩', 'clothing', 'small', false),
  s('socks', '🧦', 'clothing', 'small', false),
  s('gloves', '🧤', 'clothing', 'small', false),
  s('scarf', '🧣', 'clothing', 'small', false),
  s('shoe', '👞', 'clothing', 'small', false),
  s('coat', '🧥', 'clothing', 'small', false),
  s('cap', '🧢', 'clothing', 'small', false),
  // household objects
  s('hammer', '🔨', 'household', 'small', false),
  s('scissors', '✂️', 'household', 'small', false),
  s('key', '🔑', 'household', 'small', false),
  s('umbrella', '☂️', 'household', 'small', false),
  s('bulb', '💡', 'household', 'small', false),
  s('chair', '🪑', 'household', 'big', false),
  s('bed', '🛏️', 'household', 'big', false),
  s('phone', '📱', 'household', 'small', false),
  s('clock', '⏰', 'household', 'small', false),
  s('book', '📕', 'household', 'small', false),
  s('pencil', '✏️', 'household', 'small', false),
  s('cup', '☕', 'household', 'small', false),
  s('door', '🚪', 'household', 'big', false),
  s('sofa', '🛋️', 'household', 'big', false, false),
  // nature
  s('tree', '🌳', 'nature', 'big', true),
  s('flower', '🌸', 'nature', 'small', true),
  s('sun', '☀️', 'nature', 'big', false),
  s('moon', '🌙', 'nature', 'big', false),
  s('star', '⭐', 'nature', 'big', false),
  s('cloud', '☁️', 'nature', 'big', false),
  s('mountain', '⛰️', 'nature', 'big', false),
  s('leaf', '🍃', 'nature', 'small', true),
  s('cactus', '🌵', 'nature', 'big', true),
  s('mushroom', '🍄', 'nature', 'small', true),
  // music
  s('guitar', '🎸', 'music', 'big', false),
  s('drum', '🥁', 'music', 'big', false),
  s('trumpet', '🎺', 'music', 'small', false),
  s('violin', '🎻', 'music', 'small', false),
  s('piano', '🎹', 'music', 'big', false),
  // sport
  s('football', '⚽', 'sport', 'small', false),
  s('basketball', '🏀', 'sport', 'small', false),
  s('tennis', '🎾', 'sport', 'small', false),
  s('medal', '🏅', 'sport', 'small', false),
  s('kite', '🪁', 'sport', 'small', false),
]

export const CATEGORY_EMOJI: Record<StimulusCategory, string> = {
  animals: '🐾',
  food: '🍽️',
  vehicles: '🚦',
  clothing: '👚',
  household: '🏠',
  nature: '🌿',
  music: '🎵',
  sport: '🏆',
}
