
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { checkDomains, type DomainResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import TiltCard from "@/components/ui/tilt-card";

const MAX_DOMAINS = 5000;

const TLDs = ['.com', '.net', '.org', '.io', '.ai', '.co', '.dev', '.app', '.xyz', '.tech', '.store', '.online'];

const formSchema = z.object({
  keywords1: z.string().min(1, { message: "Please provide at least one keyword." }),
  keywords2: z.string().optional(),
  tlds: z.array(z.string()).min(1, { message: "Please select at least one TLD." }),
});

const presetLists1 = {
  'Prefix Brandables': ['a', 'ab', 'ac', 'acu', 'ada', 'adv', 'aero', 'af', 'ag', 'agro', 'ah', 'ai', 'aj', 'ak', 'al', 'ala', 'alfa', 'ali', 'alt', 'alter', 'am', 'ama', 'ami', 'amp', 'an', 'ana', 'ani', 'ant', 'anti', 'any', 'ap', 'aqua', 'ar', 'as', 'at', 'aus', 'av', 'ava', 'aw', 'ax', 'az', 'ba', 'bb', 'bc', 'bd', 'be', 'bel', 'bf', 'bi', 'bl', 'bo', 'br', 'bu', 'by', 'ca', 'ch', 'chi', 'ci', 'cine', 'cl', 'co', 'comm', 'con', 'cor', 'cosmo', 'cr', 'cre', 'crea', 'cu', 'cy', 'cyber', 'da', 'de', 'di', 'dia', 'digi', 'dis', 'do', 'dom', 'dr', 'du', 'duo', 'dy', 'dyna', 'ea', 'ec', 'econo', 'ed', 'eg', 'el', 'electro', 'em', 'en', 'epi', 'eq', 'equi', 'es', 'et', 'ex', 'exo', 'fa', 'fe', 'fi', 'fin', 'flex', 'flexi', 'flo', 'fo', 'fr', 'fu', 'ga', 'ge', 'glo', 'go', 'gr', 'ha', 'hd', 'he', 'heli', 'hi', 'ho', 'holo', 'hy', 'hyper', 'if', 'im', 'immo', 'in', 'indi', 'indo', 'infini', 'inno', 'int', 'intelli', 'inter', 'into', 'intra', 'iq', 'ir', 'is', 'it', 'ja', 'je', 'jo', 'ju', 'ka', 'ku', 'ky', 'li', 'lo', 'lu', 'ly', 'ma', 'macro', 'mag', 'mai', 'mar', 'mas', 'maxi', 'me', 'mem', 'meta', 'mi', 'mid', 'mo', 'mobi', 'mod', 'mon', 'mono', 'moto', 'mu', 'multi', 'my', 'mx', 'na', 'nat', 'navi', 'ne', 'neo', 'neu', 'neuro', 'nex', 'ni', 'no', 'nor', 'nu', 'ob', 'oc', 'of', 'og', 'ok', 'ol', 'omni', 'on', 'op', 'opti', 'or', 'os', 'out', 'ox', 'oz', 'pa', 'pe', 'penta', 'per', 'ph', 'photo', 'pi', 'po', 'poly', 'pr', 'pre', 'proto', 'pu', 'qi', 're', 'ri', 'ro', 'ru', 'sa', 'sci', 'se', 'sh', 'si', 'so', 'st', 'sub', 'super', 'sy', 'sym', 'syn', 'sync', 'ta', 'th', 'ti', 'to', 'tra', 'tr', 'trans', 'tu', 'ty', 'ui', 'ultra', 'un', 'uni', 'up', 'us', 'va', 'vc', 'velo', 'veri', 'vet', 'vo', 'vr', 'vu', 'wa', 'we', 'why', 'wi', 'with', 'wo', 'xy', 'ya', 'yo', 'za'],
  'Prefix Words': ['ace', 'access', 'action', 'active', 'add', 'admin', 'ads', 'adult', 'advantage', 'adventure', 'advertising', 'agent', 'agile', 'aim', 'air', 'alert', 'alive', 'alliance', 'aloha', 'alpha', 'alpine', 'alternative', 'always', 'amazing', 'angel', 'angry', 'animal', 'answer', 'antique', 'apex', 'apps', 'arcade', 'area', 'ark', 'arm', 'arrow', 'art', 'article', 'articles', 'artist', 'arts', 'ask', 'aspen', 'ass', 'asset', 'astro', 'atlas', 'atom', 'atomic', 'attorney', 'auction', 'audio', 'aurora', 'awesome', 'axon', 'babe', 'baby', 'back', 'bad', 'bag', 'ball', 'bamboo', 'banana', 'bang', 'bank', 'banner', 'bar', 'bare', 'bargain', 'barter', 'base', 'basic', 'bass', 'bat', 'bath', 'battery', 'battle', 'bay', 'beach', 'beam', 'bean', 'bear', 'beat', 'beautiful', 'beauty', 'bed', 'bee', 'bell', 'bella', 'ben', 'berry', 'best', 'beta', 'better', 'beyond', 'bid', 'big', 'bike', 'bill', 'bin', 'bingo', 'bird', 'bit', 'bitcoin', 'biz', 'black', 'blaze', 'blind', 'blink', 'bliss', 'blitz', 'block', 'blog', 'bloom', 'blue', 'board', 'boat', 'bob', 'body', 'bold', 'bond', 'bonus', 'book', 'booking', 'boom', 'boost', 'boss', 'bot', 'boulder', 'boutique', 'box', 'boy', 'brain', 'brand', 'bravo', 'brew', 'brick', 'bridal', 'bridge', 'bright', 'brilliant', 'brink', 'brisk', 'broad', 'broker', 'brown', 'bubble', 'bud', 'buddy', 'budget', 'buffalo', 'bug', 'build', 'building', 'bulk', 'bull', 'bus', 'business', 'busy', 'buy', 'buzz', 'byte', 'cab', 'cable', 'cad', 'cafe', 'cake', 'call', 'cam', 'camp', 'campaign', 'camping', 'campus', 'can', 'candy', 'cape', 'capital', 'captain', 'car', 'carbon', 'card', 'care', 'career', 'cargo', 'cars', 'cart', 'casa', 'case', 'cash', 'casino', 'cast', 'cat', 'catch', 'celeb', 'cell', 'cellular', 'center', 'central', 'century', 'ceo', 'certified', 'champion', 'change', 'channel', 'char', 'chart', 'chase', 'chat', 'cheap', 'check', 'chef', 'chem', 'cherry', 'chess', 'chic', 'child', 'chip', 'chocolate', 'choice', 'choose', 'chrome', 'church', 'cinema', 'circle', 'citizen', 'city', 'class', 'classic', 'clean', 'clear', 'clever', 'click', 'client', 'climate', 'climb', 'clip', 'clove', 'cloud', 'club', 'cms', 'coach', 'coast', 'coastal', 'coco', 'code', 'coffee', 'coin', 'cold', 'college', 'color', 'comet', 'comfort', 'commerce', 'commercial', 'common', 'community', 'comp', 'company', 'compare', 'complete', 'computer', 'concept', 'condo', 'connect', 'construction', 'consumer', 'contact', 'content', 'control', 'cook', 'cookie', 'cooking', 'cool', 'copper', 'copy', 'core', 'corp', 'corporate', 'cosmic', 'country', 'coupon', 'course', 'cover', 'cow', 'cpa', 'craft', 'crazy', 'create', 'creative', 'credit', 'crew', 'cricket', 'crm', 'cross', 'crowd', 'crown', 'cruise', 'crest', 'crystal', 'css', 'cube', 'culture', 'current', 'custom', 'customer', 'cut', 'cute', 'cycle', 'cyprus', 'daily', 'dan', 'dance', 'dark', 'dash', 'data', 'date', 'dating', 'day', 'dead', 'deal', 'dealer', 'deals', 'dear', 'death', 'debt', 'deco', 'deep', 'deluxe', 'demo', 'dental', 'desert', 'desi', 'design', 'designer', 'desk', 'desktop', 'destination', 'dial', 'diamond', 'diet', 'dig', 'direct', 'directory', 'dirty', 'discount', 'discover', 'discovery', 'diva', 'dive', 'divine', 'diy', 'dns', 'doc', 'doctor', 'docu', 'dog', 'dollar', 'dolphin', 'domain', 'don', 'door', 'dot', 'double', 'down', 'download', 'downtown', 'dragon', 'dream', 'dress', 'drink', 'drive', 'drift', 'droid', 'drop', 'drug', 'dry', 'duck', 'dutch', 'dynamic', 'eagle', 'ear', 'early', 'earth', 'east', 'eastern', 'easy', 'eat', 'eazy', 'echo', 'eden', 'edge', 'edit', 'education', 'egg', 'ego', 'elder', 'electric', 'electronic', 'elegant', 'elite', 'email', 'emerald', 'ember', 'empire', 'end', 'energy', 'engine', 'english', 'enjoy', 'enter', 'enterprise', 'entertainment', 'epic', 'equity', 'erotic', 'essential', 'estate', 'eternal', 'ethic', 'ethos', 'event', 'every', 'everyday', 'everything', 'evil', 'evolution', 'excel', 'excellent', 'exchange', 'exclusive', 'executive', 'exotic', 'experience', 'expert', 'explore', 'expo', 'express', 'extra', 'extreme', 'eye', 'fab', 'fabulous', 'face', 'factory', 'fair', 'faith', 'fake', 'fame', 'family', 'famous', 'fan', 'fancy', 'fantastic', 'fantasy', 'far', 'farm', 'fashion', 'fast', 'fat', 'fax', 'fed', 'feed', 'feel', 'fiber', 'field', 'fight', 'file', 'film', 'final', 'finance', 'financial', 'find', 'fine', 'fire', 'firm', 'first', 'fish', 'fit', 'fitness', 'fix', 'flair', 'flare', 'flash', 'flat', 'fleet', 'flight', 'flip', 'floor', 'flow', 'flower', 'fluid', 'fly', 'flying', 'flux', 'focus', 'follow', 'food', 'foot', 'force', 'forge', 'forest', 'forever', 'form', 'fortune', 'forum', 'four', 'fox', 'frame', 'free', 'freedom', 'fresh', 'friend', 'friendly', 'friends', 'frog', 'front', 'fruit', 'fuel', 'full', 'fun', 'fund', 'funky', 'funny', 'fuse', 'fusion', 'future', 'gadget', 'galaxy', 'gallery', 'gambling', 'game', 'gamer', 'games', 'gaming', 'garden', 'gas', 'gate', 'gator', 'gear', 'geek', 'gem', 'gene', 'general', 'generation', 'genesis', 'genius', 'genuine', 'get', 'ghost', 'giant', 'gift', 'gig', 'giga', 'girl', 'girls', 'give', 'glam', 'glass', 'gleam', 'global', 'globe', 'glow', 'goal', 'god', 'gold', 'golden', 'golf', 'good', 'gorilla', 'gospel', 'got', 'gourmet', 'grab', 'grace', 'grand', 'graphic', 'grasp', 'gray', 'great', 'greatest', 'green', 'grey', 'grid', 'groove', 'groovy', 'group', 'grow', 'guide', 'guitar', 'gulf', 'gun', 'guy', 'gym', 'hack', 'hair', 'half', 'halo', 'hand', 'handy', 'happy', 'hard', 'harmony', 'have', 'head', 'healing', 'health', 'healthy', 'heart', 'heat', 'heavy', 'helix', 'hell', 'hello', 'help', 'herb', 'herbal', 'heritage', 'hero', 'hey', 'hidden', 'high', 'hip', 'hire', 'history', 'hit', 'hobby', 'holiday', 'holistic', 'holy', 'home', 'homes', 'honest', 'honey', 'hop', 'hope', 'horizon', 'hospital', 'host', 'hosting', 'hot', 'hotel', 'house', 'how', 'hub', 'huge', 'human', 'hunt', 'hunter', 'hype', 'ice', 'icon', 'idea', 'ideal', 'identity', 'ignite', 'image', 'imagine', 'impact', 'income', 'incredible', 'independent', 'index', 'indie', 'indigo', 'industrial', 'industry', 'infinite', 'infinity', 'info', 'ink', 'inner', 'innovation', 'innovative', 'inside', 'insight', 'inspire', 'inspired', 'instant', 'insurance', 'insure', 'intelligent', 'interactive', 'international', 'internet', 'investment', 'investor', 'ion', 'iron', 'island', 'iso', 'ivory', 'ivy', 'jack', 'jam', 'java', 'jax', 'jay', 'jazz', 'jet', 'jewel', 'jewelry', 'job', 'jobs', 'joe', 'join', 'joint', 'jolt', 'journey', 'joy', 'juice', 'juicy', 'jumbo', 'jump', 'jungle', 'just', 'karma', 'keen', 'keep', 'ken', 'key', 'kick', 'kid', 'kids', 'killer', 'kin', 'kind', 'king', 'kingdom', 'kings', 'kiss', 'kit', 'kiwi', 'know', 'knowledge', 'lab', 'label', 'lady', 'lake', 'lan', 'land', 'language', 'large', 'laser', 'last', 'launch', 'lava', 'law', 'lawyer', 'lazy', 'lead', 'leader', 'leading', 'leaf', 'lean', 'learn', 'learning', 'lease', 'led', 'lee', 'legacy', 'legal', 'leisure', 'lemon', 'lending', 'leo', 'lets', 'level', 'lex', 'liberty', 'life', 'lifestyle', 'lift', 'light', 'lightning', 'like', 'lime', 'line', 'link', 'linked', 'links', 'lion', 'liquid', 'list', 'lit', 'lite', 'little', 'live', 'living', 'load', 'loan', 'local', 'lock', 'loco', 'log', 'logic', 'logo', 'long', 'look', 'loop', 'lost', 'lotus', 'loud', 'love', 'lovely', 'low', 'luck', 'lucky', 'lumen', 'luna', 'lunch', 'luxe', 'luxury', 'machine', 'mad', 'mag', 'magic', 'magical', 'mail', 'main', 'major', 'make', 'male', 'mall', 'mama', 'man', 'manage', 'mango', 'map', 'maple', 'marketing', 'mars', 'mass', 'massage', 'massive', 'master', 'mat', 'match', 'math', 'matrix', 'maui', 'max', 'maximum', 'may', 'med', 'media', 'medical', 'meet', 'meeting', 'mega', 'member', 'memo', 'memory', 'men', 'mental', 'menu', 'merchant', 'message', 'met', 'metal', 'metro', 'micro', 'mid', 'midnight', 'midwest', 'mighty', 'mike', 'mil', 'military', 'milk', 'millionaire', 'min', 'mind', 'mine', 'mini', 'mint', 'miracle', 'mirror', 'miss', 'mission', 'mister', 'mix', 'mob', 'mobile', 'model', 'modern', 'mojo', 'mom', 'mommy', 'moms', 'mondo', 'money', 'monkey', 'monster', 'moo', 'mood', 'moon', 'more', 'morning', 'mortgage', 'most', 'mother', 'motion', 'moto', 'motor', 'motorcycle', 'mountain', 'move', 'movie', 'moving', 'mrs', 'multimedia', 'muscle', 'muse', 'music', 'musical', 'mvp', 'mx', 'mystery', 'mystic', 'name', 'nation', 'national', 'native', 'natural', 'nature', 'nav', 'neat', 'need', 'neon', 'nerd', 'net', 'network', 'new', 'news', 'next', 'nexus', 'nice', 'niche', 'night', 'nine', 'ninja', 'nitro', 'noble', 'nomad', 'north', 'northern', 'not', 'note', 'nova', 'novo', 'now', 'nurse', 'nutri', 'nutrition', 'oath', 'oasis', 'occupy', 'ocean', 'odd', 'off', 'offer', 'office', 'official', 'oil', 'old', 'omega', 'one', 'online', 'only', 'open', 'option', 'orange', 'orbit', 'order', 'organic', 'original', 'our', 'out', 'outdoor', 'over', 'owl', 'own', 'pack', 'pad', 'page', 'paint', 'pak', 'pal', 'palm', 'pan', 'panda', 'papa', 'paper', 'par', 'paradise', 'parent', 'park', 'pars', 'part', 'partner', 'party', 'pass', 'passion', 'pat', 'patent', 'patient', 'paul', 'pay', 'path', 'peace', 'peak', 'pearl', 'peer', 'pen', 'penny', 'people', 'per', 'perfect', 'performance', 'personal', 'pet', 'petro', 'pets', 'pharma', 'phone', 'photo', 'photography', 'piano', 'pic', 'pick', 'pico', 'picture', 'pig', 'pilot', 'pin', 'ping', 'pink', 'pirate', 'pitch', 'pix', 'pixel', 'pizza', 'place', 'plan', 'planet', 'plant', 'plastic', 'platinum', 'play', 'player', 'pled', 'plum', 'plus', 'pocket', 'pod', 'point', 'poker', 'polar', 'pool', 'pop', 'popular', 'port', 'portable', 'portal', 'pos', 'positive', 'post', 'poster', 'pot', 'power', 'practice', 'precision', 'premier', 'premium', 'press', 'prestige', 'pretty', 'price', 'pride', 'prima', 'primary', 'prime', 'primo', 'print', 'privacy', 'private', 'prize', 'pro', 'product', 'prof', 'professional', 'profile', 'profit', 'program', 'project', 'promo', 'prop', 'property', 'propel', 'proxy', 'psychic', 'pub', 'public', 'pulse', 'puppy', 'purchase', 'pure', 'purple', 'push', 'puzzle', 'quad', 'quality', 'quantum', 'quest', 'quick', 'quiet', 'quiz', 'quote', 'race', 'racing', 'rad', 'radiant', 'radical', 'radio', 'rail', 'rain', 'rainbow', 'ram', 'random', 'rank', 'rap', 'rapid', 'rare', 'rate', 'raw', 'ray', 'reach', 'read', 'ready', 'real', 'realestate', 'reality', 'realtor', 'realty', 'rebel', 'rec', 'recipe', 'record', 'recycle', 'red', 'reel', 'reg', 'reign', 'relay', 'relic', 'remote', 'ren', 'rent', 'rental', 'rep', 'report', 'rescue', 'research', 'resort', 'restaurant', 'resume', 'retail', 'retro', 'rev', 'review', 'revolution', 'reward', 'rex', 'rhino', 'rice', 'ride', 'right', 'rift', 'ring', 'risk', 'river', 'road', 'robot', 'rock', 'rocket', 'rogue', 'roof', 'room', 'root', 'rose', 'royal', 'ruby', 'run', 'running', 'rus', 'rush', 'russian', 'safari', 'safe', 'safety', 'sage', 'sale', 'sales', 'salon', 'sam', 'sample', 'san', 'sand', 'sap', 'sat', 'save', 'saver', 'savings', 'savvy', 'say', 'scan', 'school', 'sci', 'science', 'score', 'scout', 'scrap', 'screen', 'scribe', 'script', 'sea', 'search', 'sec', 'second', 'secret', 'secrets', 'secure', 'security', 'see', 'seed', 'seek', 'select', 'self', 'sell', 'selling', 'send', 'senior', 'sense', 'sentry', 'seo', 'serene', 'serious', 'server', 'service', 'set', 'seven', 'shadow', 'share', 'shared', 'shark', 'sharp', 'she', 'shine', 'ship', 'shop', 'shopping', 'shore', 'short', 'show', 'shutter', 'sick', 'side', 'sigma', 'sign', 'signature', 'silent', 'silk', 'silver', 'sim', 'simple', 'simply', 'sin', 'sing', 'single', 'sip', 'sir', 'site', 'six', 'ski', 'skill', 'skin', 'skinny', 'sky', 'sleep', 'slick', 'slide', 'slim', 'slow', 'small', 'smart', 'smarter', 'smile', 'smooth', 'snap', 'snow', 'social', 'soft', 'software', 'sol', 'solar', 'sole', 'solid', 'solo', 'solution', 'song', 'sonic', 'soul', 'sound', 'source', 'south', 'southern', 'spa', 'space', 'spark', 'speak', 'special', 'spectrum', 'speed', 'speedy', 'spice', 'spin', 'spirit', 'splash', 'sport', 'sports', 'spot', 'spring', 'spy', 'square', 'stack', 'staff', 'stage', 'standard', 'star', 'stars', 'start', 'startup', 'stat', 'state', 'status', 'stealth', 'steam', 'steel', 'stellar', 'step', 'stereo', 'stock', 'stone', 'stop', 'storage', 'store', 'storm', 'story', 'strange', 'strategic', 'strategy', 'stream', 'street', 'strong', 'student', 'studio', 'study', 'stupid', 'style', 'success', 'sugar', 'summer', 'summit', 'sun', 'sunny', 'sunrise', 'super', 'superior', 'supply', 'support', 'supreme', 'sure', 'surf', 'survival', 'sustainable', 'swap', 'sweet', 'swift', 'swing', 'switch', 'synergy', 'system', 'tab', 'table', 'tactical', 'tag', 'take', 'talent', 'tales', 'talk', 'talking', 'tan', 'tap', 'target', 'task', 'taste', 'tasty', 'tax', 'taxi', 'tea', 'teach', 'teacher', 'team', 'tech', 'techno', 'technology', 'tek', 'tel', 'tele', 'tempo', 'ten', 'test', 'tex', 'thesis', 'think', 'thought', 'three', 'thrive', 'thunder', 'ticket', 'tiger', 'time', 'times', 'tip', 'tips', 'tix', 'today', 'together', 'togo', 'tom', 'ton', 'tone', 'tones', 'too', 'tool', 'toolbox', 'tools', 'top', 'topia', 'tops', 'total', 'totally', 'touch', 'tour', 'tours', 'tower', 'town', 'toy', 'toys', 'trac', 'trace', 'track', 'tracker', 'tracking', 'tracks', 'trade', 'trader', 'traders', 'trades', 'trading', 'traffic', 'trail', 'train', 'trainer', 'training', 'trak', 'trans', 'transfer', 'transport', 'travel', 'traveler', 'travels', 'trax', 'tree', 'trek', 'trend', 'trends', 'tribe', 'tricks', 'trip', 'trips', 'tron', 'truth', 'tube', 'tune', 'tunes', 'turk', 'turkey', 'tutor', 'tweet', 'tweets', 'twitter', 'two', 'txt', 'type', 'union', 'unit', 'united', 'universe', 'university', 'unlimited', 'update', 'updates', 'upload', 'url', 'usa', 'user', 'vacation', 'vacations', 'valley', 'value', 'values', 'van', 'vault', 'vendor', 'venture', 'ventures', 'venue', 'verse', 'vest', 'vet', 'via', 'vibe', 'vibes', 'vid', 'video', 'videos', 'vids', 'view', 'viewer', 'views', 'villa', 'village', 'ville', 'vine', 'vip', 'virtual', 'vision', 'visions', 'vista', 'visual', 'vita', 'vital', 'viva', 'vivid', 'voice', 'vote', 'vox', 'vue', 'walk', 'walker', 'wall', 'wallet', 'war', 'ware', 'warehouse', 'warrior', 'wash', 'watch', 'watcher', 'watches', 'water', 'wave', 'waves', 'way', 'ways', 'wealth', 'wear', 'weather', 'web', 'webdesign', 'webs', 'website', 'websites', 'wedding', 'week', 'weekly', 'well', 'wellness', 'werks', 'west', 'wheel', 'wheels', 'where', 'white', 'whiz', 'who', 'wholesale', 'wide', 'widget', 'wiki', 'wild', 'will', 'win', 'wind', 'window', 'windows', 'wine', 'wines', 'wing', 'wings', 'winner', 'wire', 'wired', 'wireless', 'wisdom', 'wise', 'wish', 'with', 'wiz', 'wizard', 'wizards', 'wolf', 'woman', 'women', 'wood', 'word', 'words', 'work', 'worker', 'works', 'workshop', 'world', 'worlds', 'worldwide', 'worth', 'worthy', 'worx', 'wow', 'wrap', 'write', 'writer', 'writers', 'writing', 'xchange', 'xpert', 'xpress', 'yard', 'yes', 'yoga', 'yourself', 'zen', 'zero', 'zilla', 'zip', 'zone', 'zones', 'zoo', 'zoom'],
  'US States': ['AK', 'AL', 'Alabama', 'Alaska', 'AR', 'Arizona', 'Arkansas', 'AZ', 'CA', 'Cali', 'California', 'CO', 'Colorado', 'Connecticut', 'CT', 'DE', 'Delaware', 'FL', 'Florida', 'GA', 'Georgia', 'HI', 'Hawaii', 'IA', 'ID', 'Idaho', 'IL', 'Illinois', 'IN', 'Indiana', 'Iowa', 'KS', 'Kansas', 'Kentucky', 'KY', 'LA', 'Louisiana', 'MA', 'Maine', 'Maryland', 'Mass', 'Massachusetts', 'MD', 'ME', 'MI', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'MN', 'MO', 'MS', 'MT', 'Montana', 'NC', 'ND', 'NE', 'Nebraska', 'Nevada', 'NewHampshire', 'NewJersey', 'NewMexico', 'NewYork', 'NH', 'NJ', 'NM', 'NorthCarolina', 'NorthDakota', 'NY', 'OH', 'Ohio', 'OK', 'Oklahoma', 'OR', 'Oregon', 'PA', 'Pennsylvania', 'RI', 'RhodeIsland', 'SC', 'SD', 'SouthCarolina', 'SouthDakota', 'TN', 'Tennessee', 'Tex', 'Texas', 'TX', 'UT', 'Utah', 'VA', 'Vegas', 'Vermont', 'Virginia', 'VT', 'WA', 'Washington', 'WestVirginia', 'WI', 'Wisconsin', 'WV', 'WY', 'Wyoming'],
  'US Counties': ['Adams', 'Alameda', 'Albany', 'Albuquerque', 'Allegheny', 'Allen', 'Anchorage', 'Anderson', 'AnneArundel', 'Anoka', 'Arapahoe', 'Ashtabula', 'Atlantic', 'Baltimore', 'BatonRouge', 'Bell', 'Bergen', 'Berkeley', 'Berks', 'Bernalillo', 'Bexar', 'Boulder', 'Brazoria', 'Brevard', 'Bronx', 'Broome', 'Broward', 'Bucks', 'Buncombe', 'Burlington', 'Butler', 'Cabarrus', 'Caddo', 'Calcasieu', 'Camden', 'Cameron', 'CapeMay', 'CarsonCity', 'Cascade', 'Cass', 'Champaign', 'Charleston', 'Charlotte', 'Chatham', 'Chelan', 'Chester', 'Christian', 'Clark', 'Clermont', 'Cobb', 'Collier', 'Collin', 'ColoradoSprings', 'Columbia', 'Columbus', 'ContraCosta', 'Cook', 'Coweta', 'Cowlitz', 'Cumberland', 'Cuyahoga', 'Dakota', 'Dallas', 'Dane', 'Dauphin', 'Davidson', 'Davis', 'Dayton', 'DeKalb', 'Delaware', 'Denver', 'DeSoto', 'Douglas', 'DuPage', 'Durham', 'Dutchess', 'Duval', 'ElDorado', 'ElPaso', 'Erie', 'Escambia', 'Essex', 'Fairfax', 'Fairfield', 'Fayette', 'Flathead', 'Florence', 'FortBend', 'Franklin', 'Frederick', 'Fresno', 'Fulton', 'Galveston', 'Garland', 'Gaston', 'Genesee', 'Gwinnett', 'Hamilton', 'Hampden', 'Hampton', 'Harris', 'Hartford', 'Hawaii', 'Hennepin', 'Henry', 'Hidalgo', 'Hillsborough', 'Honolulu', 'Horry', 'Howard', 'Hudson', 'Hunterdon', 'IndianRiver', 'Jackson', 'Jefferson', 'Johnson', 'Kane', 'Kankakee', 'Kaufman', 'Kenosha', 'Kent', 'Kern', 'King', 'Kings', 'Kitsap', 'Kittitas', 'Knox', 'LaCrosse', 'Lake', 'Lancaster', 'Lane', 'Latah', 'Lee', 'Lehigh', 'Leon', 'Linn', 'Livingston', 'Lorain', 'LosAngeles', 'Loudoun', 'Louisville', 'Lubbock', 'Lucas', 'Macomb', 'Madison', 'Mahoning', 'Manatee', 'Maricopa', 'Marion', 'Martin', 'Maui', 'Medina', 'Memphis', 'Mercer', 'Merrimack', 'Mesa', 'Midland', 'Milwaukee', 'Mobile', 'Mohave', 'Monmouth', 'Monroe', 'Montcalm', 'Montgomery', 'Morris', 'Multnomah', 'Muscogee', 'Nassau', 'NewCastle', 'NewHaven', 'NewLondon', 'NewOrleans', 'NewYork', 'NewportNews', 'Niagara', 'Norfolk', 'Northampton', 'Oakland', 'Ocean', 'Olmsted', 'Onondaga', 'Orange', 'Orleans', 'Osceola', 'Ottawa', 'Outagamie', 'PalmBeach', 'Pasco', 'Passaic', 'Pennington', 'Philadelphia', 'Pima', 'Pinellas', 'Placer', 'Polk', 'Portage', 'Porter', 'PrinceGeorges', 'PrinceWilliam', 'Providence', 'Pueblo', 'Putnam', 'Queens', 'Ramsey', 'Rankin', 'Reno', 'Rensselaer', 'Richland', 'Richmond', 'Riverside', 'Roanoke', 'Rock', 'Rockford', 'Rockingham', 'Rockland', 'Sacramento', 'Saginaw', 'SaintClair', 'SaintJohns', 'SaintLouis', 'SaintLucie', 'Salem', 'SaltLake', 'SanBernardino', 'SanDiego', 'SanFrancisco', 'SanJoaquin', 'SanMateo', 'SantaBarbara', 'SantaClara', 'SantaCruz', 'SantaFe', 'SantaRosa', 'Sarasota', 'Saratoga', 'Schenectady', 'Schuylkill', 'Scott', 'Sebastian', 'Sedgwick', 'Seminole', 'Shawnee', 'Shelby', 'Skagit', 'Snohomish', 'Solano', 'Somerset', 'Sonoma', 'Spartanburg', 'Spokane', 'Springfield', 'StLouis', 'StPetersburg', 'Stamford', 'SterlingHeights', 'Stockton', 'Sunnyvale', 'Syracuse', 'Tacoma', 'Tallahassee', 'Tampa', 'Temecula', 'Tempe', 'Thornton', 'ThousandOaks', 'Toledo', 'Topeka', 'Torrance', 'Tucson', 'Tulsa', 'Tuscaloosa', 'Tyler', 'Valencia', 'Vallejo', 'Vancouver', 'Vegas', 'Victorville', 'VirginiaBeach', 'Visalia', 'Waco', 'Warren', 'Washington', 'Waterbury', 'Westminster', 'Wichita', 'Wilmington', 'Winnebago', 'Worcester', 'Yakima', 'Yolo', 'York', 'Yuba', 'Yuma'],
  'US Cities': ['Abilene', 'Akron', 'Albuquerque', 'Alexandria', 'Allentown', 'Amarillo', 'Anaheim', 'AnnArbor', 'Anchorage', 'Antioch', 'Arlington', 'Arvada', 'Athens', 'Atlanta', 'ATL', 'Augusta', 'Aurora', 'Austin', 'Bakersfield', 'Baltimore', 'BatonRouge', 'Beaumont', 'Bellevue', 'Berkeley', 'Billings', 'Birmingham', 'Boise', 'Boston', 'Boulder', 'Bridgeport', 'Brownsville', 'Buffalo', 'Burbank', 'Cambridge', 'CapeCoral', 'Carrollton', 'Cary', 'CedarRapids', 'Centennial', 'Chandler', 'Charleston', 'Charlotte', 'Chattanooga', 'Chesapeake', 'Chi', 'Chicago', 'ChulaVista', 'Cincinnati', 'Clarksville', 'Clearwater', 'Cleveland', 'CollegeStation', 'ColoradoSprings', 'Columbia', 'Columbus', 'Concord', 'CoralSprings', 'Corona', 'CorpusChristi', 'CostaMesa', 'Dallas', 'DalyCity', 'Davenport', 'Davie', 'Dayton', 'DC', 'Denton', 'Denver', 'DesMoines', 'Detroit', 'Downey', 'Durham', 'Edison', 'ElCajon', 'ElMonte', 'ElPaso', 'Elgin', 'Elizabeth', 'ElkGrove', 'Erie', 'Escondido', 'Eugene', 'Evansville', 'Fairfield', 'Fargo', 'Fayetteville', 'Flint', 'Fontana', 'FortCollins', 'FortLauderdale', 'FortWayne', 'FortWorth', 'Fremont', 'Fresno', 'Frisco', 'Fullerton', 'Gainesville', 'GardenGrove', 'Garland', 'Gilbert', 'Glendale', 'GrandPrairie', 'GrandRapids', 'GreenBay', 'Greensboro', 'Gresham', 'Hampton', 'Hartford', 'Hayward', 'Henderson', 'Hialeah', 'HighPoint', 'Hollywood', 'Honolulu', 'Houston', 'HuntingtonBeach', 'Huntsville', 'Independence', 'Indianapolis', 'Inglewood', 'Irvine', 'Irving', 'Jackson', 'Jacksonville', 'JerseyCity', 'Joliet', 'KansasCity', 'Killeen', 'Knoxville', 'LA', 'Lafayette', 'Lakeland', 'Lakewood', 'Lancaster', 'Lansing', 'Laredo', 'LasVegas', 'Lewisville', 'Lexington', 'Lincoln', 'LittleRock', 'LongBeach', 'LosAngeles', 'Louisville', 'Lowell', 'Lubbock', 'Macon', 'Madison', 'Manchester', 'McAllen', 'McKinney', 'Memphis', 'Mesa', 'Mesquite', 'Miami', 'MiamiGardens', 'Midland', 'Milwaukee', 'Minneapolis', 'Miramar', 'Mobile', 'Modesto', 'Montgomery', 'MorenoValley', 'Murfreesboro', 'Murrieta', 'Naperville', 'Nashville', 'NewHaven', 'NewOrleans', 'NewYork', 'Newark', 'NewportNews', 'NOLA', 'Norfolk', 'Norman', 'Norwalk', 'NYC', 'NY', 'Oakland', 'Oceanside', 'Odessa', 'OklahomaCity', 'Olathe', 'Omaha', 'Ontario', 'Orange', 'Orlando', 'OverlandPark', 'Oxnard', 'PalmBay', 'Palmdale', 'Pasadena', 'Paterson', 'Peoria', 'PHX', 'Philly', 'Philadelphia', 'Phoenix', 'Pittsburgh', 'Plano', 'Pomona', 'PompanoBeach', 'PortStLucie', 'Portland', 'Providence', 'Provo', 'Pueblo', 'Raleigh', 'Reno', 'Rialto', 'Richardson', 'Richmond', 'Riverside', 'Rochester', 'Rockford', 'Roseville', 'RoundRock', 'Sac', 'Sacramento', 'SaintPaul', 'Salem', 'Salinas', 'SaltLakeCity', 'SanAntonio', 'SanBernardino', 'SanDiego', 'SanFrancisco', 'SanJose', 'SantaAna', 'SantaClara', 'SantaClarita', 'SantaRosa', 'Savannah', 'Scottsdale', 'Scranton', 'SD', 'Seattle', 'SF', 'Shreveport', 'SimiValley', 'SiouxFalls', 'SouthBend', 'Spokane', 'Springfield', 'StLouis', 'StPetersburg', 'Stamford', 'SterlingHeights', 'Stockton', 'Sunnyvale', 'Syracuse', 'Tacoma', 'Tallahassee', 'Tampa', 'Temecula', 'Tempe', 'Thornton', 'ThousandOaks', 'Toledo', 'Topeka', 'Torrance', 'Tucson', 'Tulsa', 'Tuscaloosa', 'Tyler', 'Valencia', 'Vallejo', 'Vancouver', 'Vegas', 'Victorville', 'VirginiaBeach', 'Visalia', 'Waco', 'Warren', 'Washington', 'Waterbury', 'Westminster', 'Wichita', 'Wilmington', 'Worcester', 'Yonkers'],
};

const presetLists2 = {
  'Suffix Words': ['ify', 'ly', 'able', 'hub', 'base'],
  'Animals': ['panther', 'eagle', 'tiger', 'lion', 'bear'],
};

export default function DomainSeekerPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [availableDomains, setAvailableDomains] = useState<DomainResult[]>([]);
  const [unavailableDomains, setUnavailableDomains] = useState<DomainResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [totalChecks, setTotalChecks] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      keywords1: "",
      keywords2: "",
      tlds: [".com", ".net", ".io", ".ai"],
    },
  });

  const handlePresetChange = (
    value: string,
    list: 'list1' | 'list2',
    onChange: (value: string) => void
  ) => {
    if (!value) return;
    const presets = list === 'list1' ? presetLists1 : presetLists2;
    const keywords = (presets as any)[value] || [];
    onChange(keywords.join('\n'));
  };

  const formValues = form.watch();

  useEffect(() => {
    const { keywords1, keywords2, tlds } = form.getValues();
    const list1 = (keywords1 || "").split('\n').map(k => k.trim()).filter(Boolean);
    const list2 = (keywords2 || "").split('\n').map(k => k.trim()).filter(Boolean);
    const selectedTlds = tlds || [];

    const firstSet = list1.length > 0 ? list1 : [""];
    const secondSet = list2.length > 0 ? list2 : [""];

    let combinations = 0;
    for (const part1 of firstSet) {
        for (const part2 of secondSet) {
            const base = (part1 + part2);
            if (base) {
                combinations++;
            }
        }
    }
    
    const count = combinations * selectedTlds.length;

    setTotalChecks(count);
  }, [formValues, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (totalChecks > MAX_DOMAINS) {
      toast({
        variant: "destructive",
        title: "Job size too large",
        description: `Please reduce keywords or TLDs. Max ${MAX_DOMAINS} checks allowed.`,
      });
      return;
    }

    setAvailableDomains([]);
    setUnavailableDomains([]);
    setProgress(0);
    setError(null);
    setCopiedDomain(null);

    startTransition(async () => {
      try {
        const stream = checkDomains(values);
        let hasResults = false;
        for await (const result of stream) {
          hasResults = true;
          if (result.status === "error") {
            setError(result.domain);
            toast({ variant: "destructive", title: "Error", description: result.domain });
            break;
          }
          if (result.status === "available") {
            setAvailableDomains((prev) => [result, ...prev]);
          } else {
            setUnavailableDomains((prev) => [result, ...prev]);
          }
          setProgress(result.progress);
        }
        if (hasResults) {
          toast({ title: "Search complete!", description: "All domain checks have finished." });
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "An unknown error occurred.";
        setError(errorMsg);
        toast({ variant: "destructive", title: "An Error Occurred", description: errorMsg });
      }
    });
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedDomain(text);
        toast({ title: "Copied to clipboard!", description: text });
        setTimeout(() => setCopiedDomain(null), 2000);
    });
  };

  const isSearching = isPending || (progress > 0 && progress < 100);

  return (
    <main className="container mx-auto max-w-4xl px-4 py-16 md:py-24">
      <div className="text-center animate-fade-in-down">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl bg-gradient-to-r from-indigo-600 to-pink-500 text-transparent bg-clip-text">
          Domain Seeker
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
          Combine keyword lists to discover unique, available domain names instantly.
        </p>
      </div>

      <div className="mt-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="keywords1"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-2">
                        <FormLabel>Keyword List 1</FormLabel>
                        <Select onValueChange={(value) => handlePresetChange(value, 'list1', field.onChange)}>
                           <div className="relative group gradient-border rounded-md">
                                <SelectTrigger className="w-[180px] h-9 border-2 border-transparent">
                                    <SelectValue placeholder="Load a preset..." />
                                </SelectTrigger>
                            </div>
                            <SelectContent>
                                {Object.keys(presetLists1).map(name => (
                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <FormControl>
                      <Textarea placeholder="cloud&#10;data&#10;web" {...field} rows={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="keywords2"
                render={({ field }) => (
                  <FormItem>
                     <div className="flex justify-between items-center mb-2">
                        <FormLabel>Keyword List 2 (optional)</FormLabel>
                        <Select onValueChange={(value) => handlePresetChange(value, 'list2', field.onChange)}>
                           <div className="relative group gradient-border rounded-md">
                                <SelectTrigger className="w-[180px] h-9 border-2 border-transparent">
                                    <SelectValue placeholder="Load a preset..." />
                                </SelectTrigger>
                            </div>
                            <SelectContent>
                                {Object.keys(presetLists2).map(name => (
                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <FormControl>
                      <Textarea placeholder="base&#10;stack&#10;flow" {...field} rows={5} />
                    </FormControl>
                    <FormDescription>Combine with List 1 to form names like 'cloudbase'.</FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tlds"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Top-Level Domains (TLDs)</FormLabel>
                    <FormDescription>Select which TLDs you want to check against.</FormDescription>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                    {TLDs.map((tld) => (
                      <FormField
                        key={tld}
                        control={form.control}
                        name="tlds"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(tld)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), tld])
                                    : field.onChange(field.value?.filter((value) => value !== tld));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{tld}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
              <div className={`text-sm ${totalChecks > MAX_DOMAINS ? 'text-red-500' : 'text-muted-foreground'}`}>
                {totalChecks} / {MAX_DOMAINS} domains
              </div>
              <Button type="submit" size="lg" disabled={isSearching || totalChecks > MAX_DOMAINS || totalChecks === 0} className="w-full sm:w-auto btn-gradient">
                {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isSearching ? `Checking... ${Math.round(progress)}%` : "Seek Domains"}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {isSearching && (
        <div className="mt-12 px-2">
          <Progress value={progress} className="w-full" />
        </div>
      )}

      {(availableDomains.length > 0 || unavailableDomains.length > 0) && !isSearching && (
         <div className="text-center mt-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <p className="text-muted-foreground">Search complete. Found {availableDomains.length} available domains.</p>
        </div>
      )}

      <div className="mt-12 grid md:grid-cols-2 gap-8 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <TiltCard glowColor="#EC4899">
          <Card className="shadow-lg bg-off-white border-gray-200/50 w-full h-full">
            <CardHeader>
              <CardTitle className="text-primary flex items-center">
                <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500">
                    <Check className="h-3 w-3 text-white" />
                </div>
                Available ({availableDomains.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableDomains.length > 0 ? (
                 <ScrollArea className="h-96">
                    <ul className="space-y-2 pr-4">
                      {availableDomains.map((d) => (
                        <li key={d.domain} className="flex justify-between items-center p-3 rounded-md hover:bg-secondary">
                          <span className="font-medium text-indigo-600">{d.domain}</span>
                          <div className="flex items-center gap-2">
                              {d.price !== undefined && (
                                <span className="text-sm text-foreground font-semibold">${d.price?.toFixed(2)}</span>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(d.domain)}>
                                 {copiedDomain === d.domain ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                              </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                </ScrollArea>
              ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">
                      {isSearching ? "Searching for available domains..." : "No available domains found."}
                  </p>
              )}
            </CardContent>
          </Card>
        </TiltCard>
        
        <TiltCard glowColor="#d1d5db">
          <Card className="shadow-lg bg-off-white border-gray-200/50 w-full h-full">
              <CardHeader>
                  <CardTitle className="flex items-center text-muted-foreground">
                      <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-300">
                          <X className="h-3 w-3 text-white" />
                      </div>
                      Unavailable ({unavailableDomains.length})
                  </CardTitle>
              </CardHeader>
              <CardContent>
              {unavailableDomains.length > 0 ? (
                   <ScrollArea className="h-96">
                      <ul className="space-y-2 pr-4">
                          {unavailableDomains.map((d) => (
                          <li key={d.domain} className="flex justify-between items-center p-3 rounded-md">
                              <span className="font-mono text-muted-foreground line-through">{d.domain}</span>
                          </li>
                          ))}
                      </ul>
                   </ScrollArea>
                   ) : (
                      <p className="text-sm text-muted-foreground text-center py-10">
                          {isSearching ? "Checking domains..." : "No unavailable domains found."}
                      </p>
                  )}
              </CardContent>
          </Card>
        </TiltCard>
      </div>
    </main>
  );
}
