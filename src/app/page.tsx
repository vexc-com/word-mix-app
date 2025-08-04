
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Loader2, Search, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { checkDomains, type DomainResult, type CheckDomainsResult } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import TiltCard from "@/components/ui/tilt-card";
import { useToast } from "@/hooks/use-toast";

const MAX_DOMAINS = 5000;

const primaryTlds = ['.com', '.net', '.org', '.io', '.ai', '.co'];
const allTlds = ['.com', '.net', '.org', '.io', '.ai', '.co', '.dev', '.app', '.xyz', '.tech', '.store', '.online', '.info', '.biz', '.mobi', '.me', '.tv', '.ws', '.cc', '.ca', '.us', '.uk', '.de', '.jp', '.fr', '.au', '.ru', '.ch', '.it', '.nl', '.se', '.no', '.es', '.mil', '.edu', '.gov', '.int', '.arpa'];
const secondaryTlds = allTlds.filter(tld => !primaryTlds.includes(tld));


const formSchema = z.object({
  keywords1: z.string().min(1, { message: "Please provide at least one keyword." }),
  keywords2: z.string().optional(),
  tlds: z.array(z.string()).min(1, { message: "Please select at least one TLD." }),
});

const presetLists1 = {
  'Prefix Brandables': ['a', 'ab', 'ac', 'acu', 'ada', 'adv', 'aero', 'af', 'ag', 'agro', 'ah', 'ai', 'aj', 'ak', 'al', 'ala', 'alfa', 'ali', 'alt', 'alter', 'am', 'ama', 'ami', 'amp', 'an', 'ana', 'ani', 'ant', 'anti', 'any', 'ap', 'aqua', 'ar', 'as', 'at', 'aus', 'av', 'ava', 'aw', 'ax', 'az', 'ba', 'bb', 'bc', 'bd', 'be', 'bel', 'bf', 'bi', 'bl', 'bo', 'br', 'bu', 'by', 'ca', 'ch', 'chi', 'ci', 'cine', 'cl', 'co', 'comm', 'con', 'cor', 'cosmo', 'cr', 'cre', 'crea', 'cu', 'cy', 'cyber', 'da', 'de', 'di', 'dia', 'digi', 'dis', 'do', 'dom', 'dr', 'du', 'duo', 'dy', 'dyna', 'ea', 'ec', 'econo', 'ed', 'eg', 'el', 'electro', 'em', 'en', 'epi', 'eq', 'equi', 'es', 'et', 'ex', 'exo', 'fa', 'fe', 'fi', 'fin', 'flex', 'flexi', 'flo', 'fo', 'fr', 'fu', 'ga', 'ge', 'glo', 'go', 'gr', 'ha', 'hd', 'he', 'heli', 'hi', 'ho', 'holo', 'hy', 'hyper', 'if', 'im', 'immo', 'in', 'indi', 'indo', 'infini', 'inno', 'int', 'intelli', 'inter', 'into', 'intra', 'iq', 'ir', 'is', 'it', 'ja', 'je', 'jo', 'ju', 'ka', 'ku', 'ky', 'li', 'lo', 'lu', 'ly', 'ma', 'macro', 'mag', 'mai', 'mar', 'mas', 'maxi', 'me', 'mem', 'meta', 'mi', 'mid', 'mo', 'mobi', 'mod', 'mon', 'mono', 'moto', 'mu', 'multi', 'my', 'mx', 'na', 'nat', 'navi', 'ne', 'neo', 'neu', 'neuro', 'nex', 'ni', 'no', 'nor', 'nu', 'ob', 'oc', 'of', 'og', 'ok', 'ol', 'omni', 'on', 'op', 'opti', 'or', 'os', 'out', 'ox', 'oz', 'pa', 'pe', 'penta', 'per', 'ph', 'photo', 'pi', 'po', 'poly', 'pr', 'pre', 'proto', 'pu', 'qi', 're', 'ri', 'ro', 'ru', 'sa', 'sci', 'se', 'sh', 'si', 'so', 'st', 'sub', 'super', 'sy', 'sym', 'syn', 'sync', 'ta', 'th', 'ti', 'to', 'tra', 'tr', 'trans', 'tu', 'ty', 'ui', 'ultra', 'un', 'uni', 'up', 'us', 'va', 'vc', 'velo', 'veri', 'vet', 'vo', 'vr', 'vu', 'wa', 'we', 'why', 'wi', 'with', 'wo', 'xy', 'ya', 'yo', 'za'],
  'Prefix Words': ['ace', 'access', 'action', 'active', 'add', 'admin', 'ads', 'adult', 'advantage', 'adventure', 'advertising', 'agent', 'agile', 'aim', 'air', 'alert', 'alive', 'alliance', 'aloha', 'alpha', 'alpine', 'alternative', 'always', 'amazing', 'angel', 'angry', 'animal', 'answer', 'antique', 'apex', 'apps', 'arcade', 'area', 'ark', 'arm', 'arrow', 'art', 'article', 'articles', 'artist', 'arts', 'ask', 'aspen', 'ass', 'asset', 'astro', 'atlas', 'atom', 'atomic', 'attorney', 'auction', 'audio', 'aurora', 'awesome', 'axon', 'babe', 'baby', 'back', 'bad', 'bag', 'ball', 'bamboo', 'banana', 'bang', 'bank', 'banner', 'bar', 'bare', 'bargain', 'barter', 'base', 'basic', 'bass', 'bat', 'bath', 'battery', 'battle', 'bay', 'beach', 'beam', 'bean', 'bear', 'beat', 'beautiful', 'beauty', 'bed', 'bee', 'bell', 'bella', 'ben', 'berry', 'best', 'beta', 'better', 'beyond', 'bid', 'big', 'bike', 'bill', 'bin', 'bingo', 'bird', 'bit', 'bitcoin', 'biz', 'black', 'blaze', 'blind', 'blink', 'bliss', 'blitz', 'block', 'blog', 'bloom', 'blue', 'board', 'boat', 'bob', 'body', 'bold', 'bond', 'bonus', 'book', 'booking', 'boom', 'boost', 'boss', 'bot', 'boulder', 'boutique', 'box', 'boy', 'brain', 'brand', 'bravo', 'brew', 'brick', 'bridal', 'bridge', 'bright', 'brilliant', 'brink', 'brisk', 'broad', 'broker', 'brown', 'bubble', 'bud', 'buddy', 'budget', 'buffalo', 'bug', 'build', 'building', 'bulk', 'bull', 'bus', 'business', 'busy', 'buy', 'buzz', 'byte', 'cab', 'cable', 'cad', 'cafe', 'cake', 'call', 'cam', 'camp', 'campaign', 'camping', 'campus', 'can', 'candy', 'cape', 'capital', 'captain', 'car', 'carbon', 'card', 'care', 'career', 'cargo', 'cars', 'cart', 'casa', 'case', 'cash', 'casino', 'cast', 'cat', 'catch', 'celeb', 'cell', 'cellular', 'center', 'central', 'century', 'ceo', 'certified', 'champion', 'change', 'channel', 'char', 'chart', 'chase', 'chat', 'cheap', 'check', 'chef', 'chem', 'cherry', 'chess', 'chic', 'child', 'chip', 'chocolate', 'choice', 'choose', 'chrome', 'church', 'cinema', 'circle', 'citizen', 'city', 'class', 'classic', 'clean', 'clear', 'clever', 'click', 'client', 'climate', 'climb', 'clip', 'clove', 'cloud', 'club', 'cms', 'coach', 'coast', 'coastal', 'coco', 'code', 'coffee', 'coin', 'cold', 'college', 'color', 'comet', 'comfort', 'commerce', 'commercial', 'common', 'community', 'comp', 'company', 'compare', 'complete', 'computer', 'concept', 'condo', 'connect', 'construction', 'consumer', 'contact', 'content', 'control', 'cook', 'cookie', 'cooking', 'cool', 'copper', 'copy', 'core', 'corp', 'corporate', 'cosmic', 'country', 'coupon', 'course', 'cover', 'cow', 'cpa', 'craft', 'crazy', 'create', 'creative', 'credit', 'crew', 'cricket', 'crm', 'cross', 'crowd', 'crown', 'cruise', 'crest', 'crystal', 'css', 'cube', 'culture', 'current', 'custom', 'customer', 'cut', 'cute', 'cycle', 'cyprus', 'daily', 'dan', 'dance', 'dark', 'dash', 'data', 'date', 'dating', 'day', 'dead', 'deal', 'dealer', 'deals', 'dear', 'death', 'debt', 'deco', 'deep', 'deluxe', 'demo', 'dental', 'desert', 'desi', 'design', 'designer', 'desk', 'desktop', 'destination', 'dial', 'diamond', 'diet', 'dig', 'direct', 'directory', 'dirty', 'discount', 'discover', 'discovery', 'diva', 'dive', 'divine', 'diy', 'dns', 'doc', 'doctor', 'docu', 'dog', 'dollar', 'dolphin', 'domain', 'don', 'door', 'dot', 'double', 'down', 'download', 'downtown', 'dragon', 'dream', 'dress', 'drink', 'drive', 'drift', 'droid', 'drop', 'drug', 'dry', 'duck', 'dutch', 'dynamic', 'eagle', 'ear', 'early', 'earth', 'east', 'eastern', 'easy', 'eat', 'eazy', 'echo', 'eden', 'edge', 'edit', 'education', 'egg', 'ego', 'elder', 'electric', 'electronic', 'elegant', 'elite', 'email', 'emerald', 'ember', 'empire', 'end', 'energy', 'engine', 'english', 'enjoy', 'enter', 'enterprise', 'entertainment', 'epic', 'equity', 'erotic', 'essential', 'estate', 'eternal', 'ethic', 'ethos', 'event', 'every', 'everyday', 'everything', 'evil', 'evolution', 'excel', 'excellent', 'exchange', 'exclusive', 'executive', 'exotic', 'experience', 'expert', 'explore', 'expo', 'express', 'extra', 'extreme', 'eye', 'fab', 'fabulous', 'face', 'factory', 'fair', 'faith', 'fake', 'fame', 'family', 'famous', 'fan', 'fancy', 'fantastic', 'fantasy', 'far', 'farm', 'fashion', 'fast', 'fat', 'fax', 'fed', 'feed', 'feel', 'fiber', 'field', 'fight', 'file', 'film', 'final', 'finance', 'financial', 'find', 'fine', 'fire', 'firm', 'first', 'fish', 'fit', 'fitness', 'fix', 'flair', 'flare', 'flash', 'flat', 'fleet', 'flight', 'flip', 'floor', 'flow', 'flower', 'fluid', 'fly', 'flying', 'flux', 'focus', 'follow', 'food', 'foot', 'force', 'forge', 'forest', 'forever', 'form', 'fortune', 'forum', 'four', 'fox', 'frame', 'free', 'freedom', 'fresh', 'friend', 'friendly', 'friends', 'frog', 'front', 'fruit', 'fuel', 'full', 'fun', 'fund', 'funky', 'funny', 'fuse', 'fusion', 'future', 'gadget', 'galaxy', 'gallery', 'gambling', 'game', 'gamer', 'games', 'gaming', 'garden', 'gas', 'gate', 'gator', 'gear', 'geek', 'gem', 'gene', 'general', 'generation', 'genesis', 'genius', 'genuine', 'get', 'ghost', 'giant', 'gift', 'gig', 'giga', 'girl', 'girls', 'give', 'glam', 'glass', 'gleam', 'global', 'globe', 'glow', 'goal', 'god', 'gold', 'golden', 'golf', 'good', 'gorilla', 'gospel', 'got', 'gourmet', 'grab', 'grace', 'grand', 'graphic', 'grasp', 'gray', 'great', 'greatest', 'green', 'grey', 'grid', 'groove', 'groovy', 'group', 'grow', 'guide', 'guitar', 'gulf', 'gun', 'guy', 'gym', 'hack', 'hair', 'half', 'halo', 'hand', 'handy', 'happy', 'hard', 'harmony', 'have', 'head', 'healing', 'health', 'healthy', 'heart', 'heat', 'heavy', 'helix', 'hell', 'hello', 'help', 'herb', 'herbal', 'heritage', 'hero', 'hey', 'hidden', 'high', 'hip', 'hire', 'history', 'hit', 'hobby', 'holiday', 'holistic', 'holy', 'home', 'homes', 'honest', 'honey', 'hop', 'hope', 'horizon', 'hospital', 'host', 'hosting', 'hot', 'hotel', 'house', 'how', 'hub', 'huge', 'human', 'hunt', 'hunter', 'hype', 'ice', 'icon', 'idea', 'ideal', 'identity', 'ignite', 'image', 'imagine', 'impact', 'income', 'incredible', 'independent', 'index', 'indie', 'indigo', 'industrial', 'industry', 'infinite', 'infinity', 'info', 'ink', 'inner', 'innovation', 'innovative', 'inside', 'insight', 'inspire', 'inspired', 'instant', 'insurance', 'insure', 'intelligent', 'interactive', 'international', 'internet', 'investment', 'investor', 'ion', 'iron', 'island', 'iso', 'ivory', 'ivy', 'jack', 'jam', 'java', 'jax', 'jay', 'jazz', 'jet', 'jewel', 'jewelry', 'job', 'jobs', 'joe', 'join', 'joint', 'jolt', 'journey', 'joy', 'juice', 'juicy', 'jumbo', 'jump', 'jungle', 'just', 'karma', 'keen', 'keep', 'ken', 'key', 'kick', 'kid', 'kids', 'killer', 'kin', 'kind', 'king', 'kingdom', 'kings', 'kiss', 'kit', 'kiwi', 'know', 'knowledge', 'lab', 'label', 'lady', 'lake', 'lan', 'land', 'language', 'large', 'laser', 'last', 'launch', 'lava', 'law', 'lawyer', 'lazy', 'lead', 'leader', 'leading', 'leaf', 'lean', 'learn', 'learning', 'lease', 'led', 'lee', 'legacy', 'legal', 'leisure', 'lemon', 'lending', 'leo', 'lets', 'level', 'lex', 'liberty', 'life', 'lifestyle', 'lift', 'light', 'lightning', 'like', 'lime', 'line', 'link', 'linked', 'links', 'lion', 'liquid', 'list', 'lit', 'lite', 'little', 'live', 'living', 'load', 'loan', 'local', 'lock', 'loco', 'log', 'logic', 'logo', 'long', 'look', 'loop', 'lost', 'lotus', 'loud', 'love', 'lovely', 'low', 'luck', 'lucky', 'lumen', 'luna', 'lunch', 'luxe', 'luxury', 'machine', 'mad', 'mag', 'magic', 'magical', 'mail', 'main', 'major', 'make', 'male', 'mall', 'mama', 'man', 'manage', 'mango', 'map', 'maple', 'marketing', 'mars', 'mass', 'massage', 'massive', 'master', 'mat', 'match', 'math', 'matrix', 'maui', 'max', 'maximum', 'may', 'med', 'media', 'medical', 'meet', 'meeting', 'mega', 'member', 'memo', 'memory', 'men', 'mental', 'menu', 'merchant', 'message', 'met', 'metal', 'metro', 'micro', 'mid', 'midnight', 'midwest', 'mighty', 'mike', 'mil', 'military', 'milk', 'millionaire', 'min', 'mind', 'mine', 'mini', 'mint', 'miracle', 'mirror', 'miss', 'mission', 'mister', 'mix', 'mob', 'mobile', 'model', 'modern', 'mojo', 'mom', 'mommy', 'moms', 'mondo', 'money', 'monkey', 'monster', 'moo', 'mood', 'moon', 'more', 'morning', 'mortgage', 'most', 'mother', 'motion', 'moto', 'motor', 'motorcycle', 'mountain', 'move', 'movie', 'moving', 'mrs', 'multimedia', 'muscle', 'muse', 'music', 'musical', 'mvp', 'mx', 'mystery', 'mystic', 'name', 'nation', 'national', 'native', 'natural', 'nature', 'nav', 'neat', 'need', 'neon', 'nerd', 'net', 'network', 'new', 'news', 'next', 'nexus', 'nice', 'niche', 'night', 'nine', 'ninja', 'nitro', 'noble', 'nomad', 'north', 'northern', 'not', 'note', 'nova', 'novo', 'now', 'nurse', 'nutri', 'nutrition', 'oath', 'oasis', 'occupy', 'ocean', 'odd', 'off', 'offer', 'office', 'official', 'oil', 'old', 'omega', 'one', 'online', 'only', 'open', 'option', 'orange', 'orbit', 'order', 'organic', 'original', 'our', 'out', 'outdoor', 'over', 'owl', 'own', 'pack', 'pad', 'page', 'paint', 'pak', 'pal', 'palm', 'pan', 'panda', 'papa', 'paper', 'papers', 'paradise', 'parent', 'park', 'pars', 'part', 'partner', 'party', 'pass', 'passion', 'pat', 'patent', 'patient', 'paul', 'pay', 'path', 'peace', 'peak', 'pearl', 'peer', 'pen', 'penny', 'people', 'per', 'perfect', 'performance', 'personal', 'pet', 'petro', 'pets', 'pharma', 'phone', 'photo', 'photography', 'piano', 'pic', 'pick', 'pico', 'picture', 'pig', 'pilot', 'pin', 'ping', 'pink', 'pirate', 'pitch', 'pix', 'pixel', 'pizza', 'place', 'plan', 'planet', 'plant', 'plastic', 'platinum', 'play', 'player', 'pled', 'plum', 'plus', 'pocket', 'pod', 'point', 'poker', 'polar', 'pool', 'pop', 'popular', 'port', 'portable', 'portal', 'portfolio', 'pos', 'post', 'poster', 'posters', 'posts', 'pot', 'power', 'practice', 'precision', 'premier', 'premium', 'press', 'prestige', 'pretty', 'price', 'prices', 'pride', 'prime', 'print', 'printer', 'printing', 'prints', 'prize', 'process', 'prod', 'product', 'production', 'productions', 'products', 'professional', 'professionals', 'professor', 'profile', 'profiles', 'profit', 'profits', 'program', 'programs', 'project', 'projects', 'promo', 'promos', 'promotion', 'promotions', 'proof', 'properties', 'property', 'pros', 'protect', 'protection', 'provider', 'proxy', 'pub', 'public', 'publications', 'publishing', 'pulse', 'pump', 'punch', 'punk', 'puppy', 'push', 'quality', 'queen', 'quest', 'questions', 'quick', 'quiz', 'quote', 'quotes', 'rabbit', 'race', 'racing', 'rack', 'radar', 'radio', 'rain', 'ranch', 'rank', 'ranking', 'rap', 'rat', 'rate', 'rates', 'rating', 'ray', 'reach', 'read', 'reader', 'ready', 'real', 'realestate', 'reality', 'realty', 'recipe', 'recipes', 'record', 'records', 'recovery', 'recruitment', 'red', 'reference', 'reg', 'register', 'registry', 'relief', 'rent', 'rental', 'rentals', 'rep', 'repair', 'report', 'reporter', 'reports', 'republic', 'res', 'rescue', 'research', 'resort', 'resource', 'resources', 'response', 'restaurant', 'results', 'resume', 'retail', 'retro', 'rev', 'review', 'reviews', 'revolution', 'reward', 'rewards', 'rex', 'rich', 'ride', 'rider', 'right', 'ring', 'rise', 'risk', 'rite', 'river', 'road', 'robot', 'rock', 'rocket', 'rocks', 'roll', 'room', 'rooms', 'root', 'rose', 'roulette', 'route', 'rules', 'run', 'runner', 'rush', 'safari', 'safe', 'safety', 'sale', 'sales', 'salon', 'sat', 'save', 'saver', 'savers', 'savings', 'savvy', 'say', 'scale', 'scan', 'scanner', 'scape', 'scapes', 'scene', 'school', 'schools', 'science', 'scoop', 'scope', 'score', 'scout', 'screen', 'scribe', 'script', 'scripts', 'sea', 'seal', 'search', 'secret', 'secrets', 'secure', 'security', 'see', 'seed', 'seek', 'seeker', 'select', 'selection', 'sell', 'seller', 'selling', 'send', 'senior', 'sense', 'seo', 'series', 'serv', 'serve', 'server', 'servers', 'service', 'services', 'set', 'seven', 'sexy', 'shgroup', 'shack', 'share', 'shares', 'sharing', 'shark', 'shed', 'sheet', 'shelf', 'shell', 'shield', 'shift', 'shine', 'ship', 'shirt', 'shirts', 'shoe', 'shoes', 'shop', 'shopper', 'shopping', 'shot', 'shots', 'show', 'showcase', 'shows', 'side', 'sight', 'sign', 'signal', 'signs', 'silver', 'simple', 'singles', 'sit', 'site', 'sites', 'six', 'ski', 'skill', 'skills', 'skin', 'skins', 'sky', 'slot', 'small', 'smart', 'smarts', 'smile', 'smith', 'sms', 'snap', 'snet', 'snow', 'soccer', 'social', 'socialmedia', 'society', 'soft', 'software', 'sol', 'solar', 'solution', 'solutions', 'son', 'song', 'songs', 'sonic', 'soul', 'sound', 'sounds', 'soup', 'source', 'sources', 'sourcing', 'south', 'spa', 'space', 'spaces', 'span', 'spark', 'speak', 'spec', 'special', 'specialist', 'specialists', 'specials', 'speed', 'sphere', 'spider', 'spin', 'spirit', 'splash', 'splus', 'sport', 'sports', 'spot', 'spots', 'spring', 'spy', 'squad', 'square', 'squared', 'stack', 'staff', 'staffing', 'stage', 'stamp', 'stand', 'star', 'stars', 'start', 'starter', 'stat', 'state', 'station', 'stats', 'status', 'steel', 'step', 'steps', 'ster', 'stick', 'stickers', 'stock', 'stocks', 'stone', 'stop', 'storage', 'store', 'stores', 'stories', 'storm', 'story', 'strategies', 'strategy', 'stream', 'streaming', 'streams', 'street', 'strong', 'student', 'studio', 'studios', 'study', 'stuff', 'style', 'styles', 'success', 'sugar', 'suite', 'summit', 'sun', 'super', 'superstore', 'supplier', 'supplies', 'supply', 'support', 'sure', 'surf', 'surfer', 'surfing', 'survey', 'surveys', 'swag', 'swap', 'sweet', 'switch', 'synergy', 'sys', 'system', 'systems', 'tab', 'table', 'tablet', 'tag', 'tags', 'talent', 'tales', 'talk', 'talks', 'tank', 'tap', 'tape', 'target', 'task', 'tastic', 'tax', 'taxi', 'tea', 'teacher', 'team', 'tech', 'technologies', 'technology', 'techs', 'tee', 'teen', 'teens', 'tees', 'tek', 'tel', 'tell', 'template', 'templates', 'ten', 'tennis', 'test', 'testing', 'tex', 'text', 'theater', 'theatre', 'theme', 'themes', 'theory', 'therapy', 'thing', 'things', 'think', 'thoughts', 'threads', 'ticket', 'tickets', 'tiger', 'time', 'times', 'tip', 'tips', 'tix', 'today', 'together', 'togo', 'tom', 'ton', 'tone', 'tones', 'too', 'tool', 'toolbox', 'tools', 'top', 'topia', 'tops', 'total', 'touch', 'tour', 'tours', 'tower', 'town', 'toy', 'toys', 'trac', 'trace', 'track', 'tracker', 'tracking', 'tracks', 'trade', 'trader', 'traders', 'trades', 'trading', 'traffic', 'trail', 'train', 'trainer', 'training', 'trak', 'trans', 'transfer', 'transport', 'travel', 'traveler', 'travels', 'trax', 'tree', 'trek', 'trend', 'trends', 'tribe', 'tricks', 'trip', 'trips', 'tron', 'truth', 'tube', 'tune', 'tunes', 'turk', 'turkey', 'tutor', 'tweet', 'tweets', 'twitter', 'two', 'txt', 'type', 'union', 'unit', 'united', 'universe', 'university', 'unlimited', 'update', 'updates', 'upload', 'url', 'usa', 'user', 'vacation', 'vacations', 'valley', 'value', 'values', 'van', 'vault', 'vendor', 'venture', 'ventures', 'venue', 'verse', 'vest', 'vet', 'via', 'vibe', 'vibes', 'vid', 'video', 'videos', 'vids', 'view', 'viewer', 'views', 'villa', 'village', 'ville', 'vine', 'vip', 'virtual', 'vision', 'visions', 'vista', 'visual', 'vita', 'vital', 'viva', 'vivid', 'voice', 'vote', 'vox', 'vue', 'walk', 'walker', 'wall', 'wallet', 'war', 'ware', 'warehouse', 'warrior', 'wash', 'watch', 'watcher', 'watches', 'water', 'wave', 'waves', 'way', 'ways', 'wealth', 'wear', 'weather', 'web', 'webdesign', 'webs', 'website', 'websites', 'wedding', 'week', 'weekly', 'well', 'wellness', 'werks', 'west', 'wheel', 'wheels', 'where', 'white', 'whiz', 'who', 'wholesale', 'wide', 'widget', 'wiki', 'wild', 'will', 'win', 'wind', 'window', 'windows', 'wine', 'wines', 'wing', 'wings', 'winner', 'wire', 'wired', 'wireless', 'wisdom', 'wise', 'wish', 'with', 'wiz', 'wizard', 'wizards', 'wolf', 'woman', 'women', 'wood', 'word', 'words', 'work', 'worker', 'works', 'workshop', 'world', 'worlds', 'worldwide', 'worth', 'worthy', 'worx', 'wow', 'wrap', 'write', 'writer', 'writers', 'writing', 'xchange', 'xpert', 'xpress', 'yard', 'yes', 'yoga', 'yourself', 'zen', 'zero', 'zilla', 'zip', 'zone', 'zones', 'zoo', 'zoom'],
  'Animals': ['Alligator', 'Ant', 'Antelope', 'Ape', 'Armadillo', 'Baboon', 'Badger', 'Bat', 'Bear', 'Beaver', 'Bee', 'Beetle', 'Bison', 'Boar', 'Buffalo', 'Butterfly', 'Camel', 'Capybara', 'Caribou', 'Cat', 'Caterpillar', 'Chameleon', 'Cheetah', 'Chicken', 'Chimp', 'Chipmunk', 'Clam', 'Cobra', 'Cockroach', 'Cod', 'Coyote', 'Crab', 'Crane', 'Cricket', 'Crocodile', 'Crow', 'Deer', 'Dingo', 'Dino', 'Dog', 'Dolphin', 'Donkey', 'Dove', 'Dragonfly', 'Duck', 'Eagle', 'Eel', 'Elephant', 'Elk', 'Emu', 'Falcon', 'Finch', 'Firefly', 'Fish', 'Flamingo', 'Fly', 'Fox', 'Frog', 'Gazelle', 'Gecko', 'Gerbil', 'Gibbon', 'Giraffe', 'Gnat', 'Goat', 'Goldfish', 'Goose', 'Gopher', 'Gorilla', 'Grasshopper', 'Gull', 'Hamster', 'Hare', 'Hawk', 'Hedgehog', 'Hippo', 'Hornet', 'Horse', 'Hummingbird', 'Hyena', 'Iguana', 'Jaguar', 'Jay', 'Jellyfish', 'Kangaroo', 'Kingfisher', 'Koala', 'KomodoDragon', 'Ladybug', 'Leopard', 'Lion', 'Lizard', 'Llama', 'Lobster', 'Lynx', 'Macaw', 'Manatee', 'Manta', 'Monkey', 'Moose', 'Mosquito', 'Moth', 'Mouse', 'Mule', 'Octopus', 'Orca', 'Ostrich', 'Otter', 'Owl', 'Oyster', 'Panther', 'Parrot', 'Peacock', 'Pelican', 'Penguin', 'Pig', 'Pigeon', 'Pony', 'Porcupine', 'Puma', 'Rabbit', 'Raccoon', 'Ram', 'Rat', 'Raven', 'Reindeer', 'Rhino', 'Roadrunner', 'Robin', 'Salamander', 'Salmon', 'Scorpion', 'Seahorse', 'Seal', 'Shark', 'Sheep', 'Shrimp', 'Skunk', 'Snake', 'Sparrow', 'Spider', 'Squid', 'Squirrel', 'Starfish', 'Swan', 'Tiger', 'Toad', 'Tortoise', 'Toucan', 'Tuna', 'Turkey', 'Turtle', 'Viper', 'Vulture', 'Walrus', 'Wasp', 'Whale', 'Wolf', 'Wolverine', 'Woodpecker', 'Zebra']
};

const presetLists2 = {
    'Suffix Brandables': ['a', 'ab', 'ac', 'ad', 'ada', 'adv', 'aero', 'af', 'ag', 'agro', 'ah', 'ai', 'aj', 'ak', 'al', 'ala', 'alfa', 'ali', 'alt', 'alter', 'am', 'ama', 'ami', 'amp', 'an', 'ana', 'and', 'ani', 'ant', 'any', 'ap', 'aqua', 'ar', 'as', 'at', 'av', 'aw', 'ax', 'az', 'ba', 'bb', 'bc', 'bd', 'be', 'bf', 'bi', 'bl', 'bo', 'br', 'bu', 'by', 'ca', 'ce', 'ch', 'ci', 'cl', 'co', 'con', 'cor', 'cr', 'cre', 'crea', 'cs', 'ct', 'cu', 'cy', 'da', 'de', 'di', 'dia', 'digi', 'dis', 'do', 'dom', 'dr', 'du', 'duo', 'dy', 'ea', 'ec', 'econo', 'ed', 'ee', 'eg', 'el', 'electro', 'em', 'en', 'ent', 'eo', 'ep', 'epi', 'eq', 'equi', 'er', 'ers', 'es', 'et', 'ex', 'exo', 'ey', 'ez', 'fa', 'fe', 'fi', 'for', 'fr', 'fs', 'fu', 'fy', 'ga', 'ge', 'glo', 'go', 'gr', 'ha', 'hd', 'he', 'hi', 'ho', 'hq', 'hy', 'ia', 'ian', 'ic', 'id', 'ie', 'ies', 'ify', 'ii', 'il', 'im', 'in', 'io', 'ion', 'ip', 'iq', 'ir', 'is', 'ish', 'ism', 'it', 'its', 'ity', 'ium', 'ix', 'ize', 'je', 'ji', 'jo', 'ju', 'ka', 'ko', 'ku', 'ky', 'la', 'le', 'li', 'lo', 'ls', 'lu', 'ly', 'ma', 'ms', 'mu', 'mx', 'na', 'nc', 'ne', 'ng', 'ngo', 'ni', 'nj', 'no', 'ns', 'nt', 'ny', 'nz', 'ob', 'oc', 'of', 'og', 'ok', 'ol', 'om', 'on', 'oo', 'op', 'or', 'os', 'out', 'ow', 'ox', 'oz', 'pa', 'pc', 'pe', 'ph', 'pi', 'pl', 'pm', 'po', 'pr', 'pre', 'pro', 'ps', 'pt', 'ra', 'rc', 're', 'ri', 'ro', 'rr', 'rs', 'ru', 'ry', 'sa', 'sc', 'se', 'sh', 'si', 'so', 'sp', 'ss', 'st', 'su', 'sy', 'ta', 'tc', 'te', 'ter', 'th', 'that', 'the', 'ti', 'to', 'tr', 'ts', 'tt', 'tu', 'tv', 'ty', 'uk', 'um', 'un', 'up', 'ur', 'us', 'va', 'vc', 've', 'vi', 'vo', 'vr', 'vu', 'wa', 'we', 'who', 'why', 'wi', 'wo', 'xs', 'xx', 'ya', 'yo', 'ys', 'za', 'ze', 'zi', 'zo', 'zy', 'zz'],
    'Suffix Words': ['ace', 'access', 'account', 'action', 'active', 'add', 'addict', 'admin', 'ads', 'advantage', 'adventure', 'advice', 'advisor', 'advisors', 'again', 'age', 'agency', 'agent', 'agents', 'air', 'alert', 'alerts', 'alive', 'all', 'alley', 'ally', 'america', 'analysis', 'analytics', 'angel', 'answer', 'anywhere', 'api', 'app', 'apparel', 'arc', 'arch', 'archive', 'area', 'ark', 'armor', 'army', 'around', 'art', 'artist', 'artists', 'arts', 'asset', 'assets', 'assist', 'assistant', 'associates', 'association', 'atlanta', 'atlas', 'attack', 'attorney', 'audio', 'audit', 'austin', 'authority', 'auto', 'automation', 'avenue', 'award', 'aware', 'away', 'axis', 'babe', 'baby', 'back', 'backup', 'balance', 'ball', 'bamboo', 'banana', 'bang', 'bank', 'banking', 'banks', 'banner', 'bar', 'bargain', 'barn', 'bars', 'base', 'basics', 'bay', 'beach', 'beam', 'bean', 'bear', 'beast', 'beat', 'beauty', 'bed', 'bee', 'beer', 'bell', 'bench', 'benefits', 'berry', 'best', 'bet', 'beta', 'bets', 'better', 'beyond', 'bid', 'bids', 'big', 'bill', 'bin', 'bio', 'bird', 'bit', 'bite', 'bites', 'bits', 'black', 'blast', 'bling', 'bliss', 'block', 'blocks', 'blue', 'board', 'boards', 'boat', 'body', 'bomb', 'bond', 'bonus', 'book', 'booking', 'books', 'boom', 'boost', 'booster', 'booth', 'boss', 'boston', 'bot', 'bots', 'bound', 'boutique', 'box', 'boxes', 'boy', 'boys', 'brain', 'brains', 'brand', 'branding', 'brands', 'break', 'brew', 'bridge', 'bright', 'bro', 'broker', 'brokers', 'brothers', 'bubble', 'bucket', 'bud', 'buddies', 'buddy', 'budget', 'bug', 'build', 'builder', 'builders', 'building', 'bull', 'bunny', 'bureau', 'bus', 'business', 'buster', 'butler', 'button', 'buy', 'buyer', 'buyers', 'buys', 'buzz', 'byte', 'bytes', 'cab', 'cable', 'cache', 'cad', 'caddy', 'cafe', 'cake', 'call', 'calls', 'cam', 'camera', 'camp', 'campus', 'cams', 'can', 'candy', 'canvas', 'cap', 'capital', 'car', 'card', 'cards', 'care', 'career', 'careers', 'cargo', 'cars', 'cart', 'casa', 'case', 'cases', 'cash', 'casino', 'cast', 'caster', 'casting', 'castle', 'cat', 'catalog', 'catering', 'cats', 'cave', 'cell', 'center', 'centers', 'central', 'centric', 'ceo', 'chain', 'challenge', 'champ', 'champion', 'change', 'channel', 'charge', 'chart', 'charter', 'charts', 'chase', 'chat', 'chatter', 'cheap', 'check', 'checker', 'checks', 'chef', 'chem', 'chick', 'child', 'chip', 'chips', 'choice', 'choices', 'circle', 'circles', 'city', 'clan', 'class', 'classic', 'clean', 'cleaning', 'clear', 'click', 'clicks', 'clinic', 'clip', 'clips', 'clock', 'clothing', 'cloud', 'clouds', 'club', 'clubs', 'coach', 'coaching', 'code', 'coder', 'codes', 'coin', 'coins', 'collective', 'collector', 'college', 'color', 'colors', 'comet', 'comfort', 'commerce', 'commercial', 'communication', 'community', 'comp', 'companies', 'companion', 'company', 'compare', 'compass', 'complete', 'computer', 'concept', 'concepts', 'concierge', 'conference', 'connect', 'connection', 'connector', 'construction', 'consult', 'consultancy', 'consultant', 'consultants', 'consulting', 'contact', 'contacts', 'content', 'contest', 'control', 'cook', 'cool', 'coop', 'cop', 'copy', 'core', 'corner', 'corp', 'corporation', 'corps', 'cosmetics', 'cost', 'count', 'counter', 'country', 'coupon', 'coupons', 'course', 'courses', 'court', 'couture', 'cove', 'cover', 'covers', 'cow', 'craft', 'craze', 'crazy', 'create', 'creation', 'creations', 'creative', 'creator', 'credit', 'credits', 'crew', 'critic', 'cross', 'crowd', 'cruise', 'crunch', 'crush', 'cube', 'culture', 'cup', 'cure', 'cut', 'cycle', 'dad', 'daily', 'dance', 'dash', 'dashboard', 'data', 'database', 'date', 'dating', 'day', 'days', 'deal', 'dealer', 'deck', 'decor', 'defense', 'deli', 'delight', 'delivery', 'deluxe', 'demo', 'den', 'dental', 'depot', 'design', 'designer', 'designers', 'designs', 'desk', 'detective', 'developer', 'development', 'devil', 'dial', 'diamond', 'diary', 'diet', 'dig', 'digest', 'digital', 'direct', 'director', 'discovery', 'dish', 'display', 'distribution', 'diva', 'diy', 'dj', 'dna', 'doc', 'dock', 'docs', 'doctor', 'dog', 'dollar', 'dome', 'door', 'dot', 'down', 'download', 'dragon', 'draw', 'dream', 'dreams', 'dress', 'drink', 'drive', 'driver', 'droid', 'drop', 'dude', 'dynamics', 'earth', 'ease', 'east', 'easy', 'edge', 'edit', 'editor', 'education', 'effect', 'egg', 'electric', 'elements', 'elite', 'email', 'empire', 'emporium', 'end', 'energy', 'engine', 'engineer', 'engineering', 'enterprise', 'enterprises', 'entertainment', 'equipment', 'equity', 'era', 'essentials', 'estate', 'etc', 'event', 'events', 'everything', 'evolution', 'exchange', 'experience', 'expert', 'experts', 'explorer', 'expo', 'express', 'extra', 'extreme', 'eye', 'eyes', 'fabric', 'face', 'fact', 'factor', 'factory', 'fail', 'fair', 'fairy', 'family', 'fan', 'fans', 'fantasy', 'fare', 'farm', 'farms', 'fashion', 'fast', 'feed', 'fest', 'fever', 'field', 'fight', 'file', 'files', 'filter', 'finance', 'financial', 'find', 'finder', 'finders', 'fire', 'firm', 'first', 'fish', 'fit', 'fitness', 'five', 'fix', 'flash', 'flex', 'flicks', 'flight', 'flip', 'flix', 'floor', 'flow', 'flower', 'flowers', 'fly', 'flyer', 'focus', 'folder', 'folio', 'food', 'foods', 'foot', 'force', 'forest', 'forever', 'forex', 'forge', 'form', 'forms', 'formula', 'fortune', 'forum', 'forward', 'foto', 'foundation', 'four', 'fox', 'frame', 'franchise', 'freak', 'freaks', 'free', 'freedom', 'frenzy', 'fresh', 'friend', 'friendly', 'friends', 'frog', 'front', 'fruit', 'fuel', 'full', 'fun', 'fund', 'funding', 'funds', 'fuse', 'fusion', 'future', 'gadget', 'gadgets', 'gain', 'gal', 'galaxy', 'gallery', 'game', 'gamer', 'games', 'gaming', 'gang', 'garage', 'garden', 'gas', 'gate', 'gateway', 'gator', 'gear', 'geek', 'geeks', 'gem', 'gems', 'gen', 'generation', 'generator', 'genie', 'genius', 'geo', 'get', 'giant', 'gift', 'gifts', 'gig', 'girl', 'glass', 'global', 'globe', 'go', 'goal', 'god', 'gold', 'good', 'goods', 'gourmet', 'grade', 'gram', 'graph', 'graphic', 'graphics', 'great', 'green', 'grid', 'groove', 'ground', 'group', 'groups', 'grow', 'guard', 'guide', 'guides', 'guild', 'gun', 'guru', 'guy', 'guys', 'gym', 'hack', 'hacker', 'hacks', 'hair', 'hall', 'hand', 'happy', 'hardware', 'harmony', 'hat', 'haven', 'hawk', 'head', 'heads', 'health', 'healthcare', 'heart', 'heat', 'heaven', 'hell', 'help', 'helper', 'here', 'hero', 'heroes', 'high', 'hill', 'hire', 'history', 'hit', 'hits', 'hive', 'holdings', 'home', 'homes', 'hood', 'hook', 'hop', 'hope', 'hopper', 'host', 'hosting', 'hot', 'hotel', 'hotels', 'hound', 'hour', 'house', 'houses', 'how', 'hq', 'hub', 'hunt', 'hunter', 'hunters', 'hut', 'hype', 'ice', 'icon', 'idea', 'ideas', 'image', 'images', 'imaging', 'impact', 'import', 'inbox', 'income', 'incorporated', 'index', 'industries', 'industry', 'info', 'information', 'ing', 'inn', 'innovation', 'innovations', 'ins', 'inside', 'insider', 'insight', 'insights', 'institute', 'insurance', 'insure', 'intelligence', 'interactive', 'interiors', 'international', 'internet', 'invest', 'investment', 'investments', 'investor', 'island', 'ist', 'jack', 'jam', 'jar', 'jazz', 'jeans', 'jet', 'jewelry', 'job', 'jobs', 'joe', 'journal', 'journey', 'joy', 'juice', 'jump', 'junction', 'jungle', 'junkie', 'junkies', 'junky', 'karma', 'kart', 'keeper', 'key', 'keys', 'kick', 'kid', 'kids', 'kin', 'king', 'kingdom', 'kings', 'kiosk', 'kiss', 'kit', 'kitchen', 'kits', 'knowledge', 'lab', 'label', 'labels', 'labs', 'lady', 'lake', 'land', 'lane', 'laser', 'launch', 'law', 'lawyer', 'lawyers', 'lead', 'leader', 'leaders', 'leads', 'leaf', 'league', 'learn', 'learning', 'lease', 'led', 'lee', 'legal', 'lens', 'ler', 'less', 'lessons', 'let', 'letter', 'level', 'life', 'lifestyle', 'lift', 'light', 'lighting', 'lights', 'like', 'limited', 'line', 'lines', 'link', 'links', 'lion', 'list', 'listing', 'listings', 'lists', 'lit', 'lite', 'live', 'living', 'llc', 'load', 'loan', 'loans', 'local', 'location', 'locator', 'lock', 'locker', 'lodge', 'loft', 'log', 'logic', 'login', 'logistics', 'logo', 'logos', 'logs', 'look', 'loop', 'lord', 'lot', 'lottery', 'lotto', 'lounge', 'love', 'lover', 'lovers', 'luck', 'lux', 'luxury', 'machine', 'machines', 'mad', 'made', 'madness', 'mafia', 'mag', 'magazine', 'magic', 'magnet', 'mail', 'mailer', 'make', 'maker', 'makers', 'mall', 'mama', 'man', 'manage', 'management', 'manager', 'mania', 'maniac', 'manual', 'map', 'maps', 'marine', 'mark', 'market', 'marketing', 'marketplace', 'markets', 'marks', 'mart', 'mash', 'mass', 'massage', 'master', 'masters', 'mat', 'match', 'mate', 'mates', 'math', 'matic', 'matrix', 'matter', 'matters', 'maven', 'max', 'media', 'medic', 'medical', 'medicine', 'meet', 'meeting', 'meme', 'memo', 'memory', 'men', 'mentor', 'menu', 'merchant', 'mesh', 'message', 'messenger', 'metal', 'meter', 'method', 'metrics', 'metrix', 'metro', 'mex', 'micro', 'miles', 'mill', 'mind', 'minder', 'minds', 'mine', 'mint', 'mirror', 'mission', 'mix', 'mixer', 'mob', 'mobile', 'mobility', 'mod', 'mode', 'model', 'models', 'mojo', 'mom', 'moms', 'money', 'monitor', 'monkey', 'monster', 'monsters', 'moon', 'more', 'mortgage', 'motion', 'moto', 'motor', 'motors', 'mountain', 'mouse', 'move', 'movement', 'movers', 'moves', 'multimedia', 'muse', 'museum', 'music', 'name', 'names', 'nation', 'nature', 'navi', 'navigator', 'needs', 'nerd', 'ness', 'nest', 'net', 'nets', 'network', 'networking', 'networks', 'new', 'news', 'newsletter', 'next', 'nexus', 'nic', 'nice', 'night', 'nine', 'ninja', 'node', 'north', 'note', 'notes', 'nova', 'now', 'nut', 'nutrition', 'nuts', 'oasis', 'ocean', 'offer', 'offers', 'office', 'ography', 'oil', 'ology', 'one', 'online', 'only', 'opia', 'opolis', 'ops', 'option', 'options', 'orama', 'orange', 'order', 'org', 'organic', 'organizer', 'outlet', 'over', 'owl', 'ox', 'pac', 'pack', 'package', 'packs', 'pad', 'pads', 'page', 'pages', 'paint', 'painting', 'pak', 'pal', 'palace', 'pals', 'pan', 'panda', 'panel', 'paper', 'papers', 'paradise', 'park', 'parking', 'part', 'parties', 'partner', 'partners', 'parts', 'party', 'pass', 'passion', 'patch', 'path', 'patrol', 'pay', 'payment', 'payments', 'peak', 'pedia', 'pen', 'people', 'perfect', 'performance', 'perks', 'pet', 'pets', 'pharma', 'pharmacy', 'phone', 'phones', 'photo', 'photography', 'photos', 'pic', 'pick', 'picks', 'pics', 'picture', 'pictures', 'pie', 'pig', 'pilot', 'pin', 'ping', 'pink', 'pipe', 'pit', 'pix', 'pixel', 'pixels', 'pizza', 'place', 'places', 'plan', 'planet', 'planner', 'planning', 'plans', 'plant', 'plate', 'platform', 'play', 'player', 'plaza', 'please', 'plex', 'plug', 'plus', 'pocket', 'pod', 'podcast', 'point', 'points', 'poker', 'politics', 'poll', 'pon', 'pond', 'pool', 'pop', 'port', 'portal', 'portfolio', 'pos', 'post', 'poster', 'posters', 'posts', 'pot', 'power', 'premium', 'prep', 'press', 'preview', 'price', 'prices', 'pride', 'prime', 'print', 'printer', 'printing', 'prints', 'prize', 'process', 'prod', 'product', 'production', 'productions', 'products', 'professional', 'professionals', 'professor', 'profile', 'profiles', 'profit', 'profits', 'program', 'programs', 'project', 'projects', 'promo', 'promos', 'promotion', 'promotions', 'proof', 'properties', 'property', 'pros', 'protect', 'protection', 'provider', 'proxy', 'pub', 'public', 'publications', 'publishing', 'pulse', 'pump', 'punch', 'punk', 'puppy', 'push', 'quality', 'queen', 'quest', 'questions', 'quick', 'quiz', 'quote', 'quotes', 'rabbit', 'race', 'racing', 'rack', 'radar', 'radio', 'rain', 'ranch', 'rank', 'ranking', 'rap', 'rat', 'rate', 'rates', 'rating', 'ray', 'reach', 'read', 'reader', 'ready', 'real', 'realestate', 'reality', 'realty', 'recipe', 'recipes', 'record', 'records', 'recovery', 'recruitment', 'red', 'reference', 'reg', 'register', 'registry', 'relief', 'rent', 'rental', 'rentals', 'rep', 'repair', 'report', 'reporter', 'reports', 'republic', 'res', 'rescue', 'research', 'resort', 'resource', 'resources', 'response', 'restaurant', 'results', 'resume', 'retail', 'retro', 'rev', 'review', 'reviews', 'revolution', 'reward', 'rewards', 'rex', 'rich', 'ride', 'rider', 'right', 'ring', 'rise', 'risk', 'rite', 'river', 'road', 'robot', 'rock', 'rocket', 'rocks', 'roll', 'room', 'rooms', 'root', 'rose', 'roulette', 'route', 'rules', 'run', 'runner', 'rush', 'safari', 'safe', 'safety', 'sale', 'sales', 'salon', 'sat', 'save', 'saver', 'savers', 'savings', 'savvy', 'say', 'scale', 'scan', 'scanner', 'scape', 'scapes', 'scene', 'school', 'schools', 'science', 'scoop', 'scope', 'score', 'scout', 'screen', 'scribe', 'script', 'scripts', 'sea', 'seal', 'search', 'secret', 'secrets', 'secure', 'security', 'see', 'seed', 'seek', 'seeker', 'select', 'selection', 'sell', 'seller', 'selling', 'send', 'senior', 'sense', 'seo', 'series', 'serv', 'serve', 'server', 'servers', 'service', 'services', 'set', 'seven', 'sexy', 'shgroup', 'shack', 'share', 'shares', 'sharing', 'shark', 'shed', 'sheet', 'shelf', 'shell', 'shield', 'shift', 'shine', 'ship', 'shirt', 'shirts', 'shoe', 'shoes', 'shop', 'shopper', 'shopping', 'shot', 'shots', 'show', 'showcase', 'shows', 'side', 'sight', 'sign', 'signal', 'signs', 'silver', 'simple', 'singles', 'sit', 'site', 'sites', 'six', 'ski', 'skill', 'skills', 'skin', 'skins', 'sky', 'slot', 'small', 'smart', 'smarts', 'smile', 'smith', 'sms', 'snap', 'snet', 'snow', 'soccer', 'social', 'socialmedia', 'society', 'soft', 'software', 'sol', 'solar', 'solution', 'solutions', 'son', 'song', 'songs', 'sonic', 'soul', 'sound', 'sounds', 'soup', 'source', 'sources', 'sourcing', 'south', 'spa', 'space', 'spaces', 'span', 'spark', 'speak', 'spec', 'special', 'specialist', 'specialists', 'specials', 'speed', 'sphere', 'spider', 'spin', 'spirit', 'splash', 'splus', 'sport', 'sports', 'spot', 'spots', 'spring', 'spy', 'squad', 'square', 'squared', 'stack', 'staff', 'staffing', 'stage', 'stamp', 'stand', 'star', 'stars', 'start', 'starter', 'stat', 'state', 'station', 'stats', 'status', 'steel', 'step', 'steps', 'ster', 'stick', 'stickers', 'stock', 'stocks', 'stone', 'stop', 'storage', 'store', 'stores', 'stories', 'storm', 'story', 'strategies', 'strategy', 'stream', 'streaming', 'streams', 'street', 'strong', 'student', 'studio', 'studios', 'study', 'stuff', 'style', 'styles', 'success', 'sugar', 'suite', 'summit', 'sun', 'super', 'superstore', 'supplier', 'supplies', 'supply', 'support', 'sure', 'surf', 'surfer', 'surfing', 'survey', 'surveys', 'swag', 'swap', 'sweet', 'switch', 'synergy', 'sys', 'system', 'systems', 'tab', 'table', 'tablet', 'tag', 'tags', 'talent', 'tales', 'talk', 'talks', 'tank', 'tap', 'tape', 'target', 'task', 'tastic', 'tax', 'taxi', 'tea', 'teacher', 'team', 'tech', 'technologies', 'technology', 'techs', 'tee', 'teen', 'teens', 'tees', 'tek', 'tel', 'tell', 'template', 'templates', 'ten', 'tennis', 'test', 'testing', 'tex', 'text', 'theater', 'theatre', 'theme', 'themes', 'theory', 'therapy', 'thing', 'things', 'think', 'thoughts', 'threads', 'ticket', 'tickets', 'tiger', 'time', 'times', 'tip', 'tips', 'tix', 'today', 'together', 'togo', 'tom', 'ton', 'tone', 'tones', 'too', 'tool', 'toolbox', 'tools', 'top', 'topia', 'tops', 'total', 'touch', 'tour', 'tours', 'tower', 'town', 'toy', 'toys', 'trac', 'trace', 'track', 'tracker', 'tracking', 'tracks', 'trade', 'trader', 'traders', 'trades', 'trading', 'traffic', 'trail', 'train', 'trainer', 'training', 'trak', 'trans', 'transfer', 'transport', 'travel', 'traveler', 'travels', 'trax', 'tree', 'trek', 'trend', 'trends', 'tribe', 'tricks', 'trip', 'trips', 'tron', 'truth', 'tube', 'tune', 'tunes', 'turk', 'turkey', 'tutor', 'tweet', 'tweets', 'twitter', 'two', 'txt', 'type', 'union', 'unit', 'united', 'universe', 'university', 'unlimited', 'update', 'updates', 'upload', 'url', 'usa', 'user', 'vacation', 'vacations', 'valley', 'value', 'values', 'van', 'vault', 'vendor', 'venture', 'ventures', 'venue', 'verse', 'vest', 'vet', 'via', 'vibe', 'vibes', 'vid', 'video', 'videos', 'vids', 'view', 'viewer', 'views', 'villa', 'village', 'ville', 'vine', 'vip', 'virtual', 'vision', 'visions', 'vista', 'visual', 'vita', 'vital', 'viva', 'vivid', 'voice', 'vote', 'vox', 'vue', 'walk', 'walker', 'wall', 'wallet', 'war', 'ware', 'warehouse', 'warrior', 'wash', 'watch', 'watcher', 'watches', 'water', 'wave', 'waves', 'way', 'ways', 'wealth', 'wear', 'weather', 'web', 'webdesign', 'webs', 'website', 'websites', 'wedding', 'week', 'weekly', 'well', 'wellness', 'werks', 'west', 'wheel', 'wheels', 'where', 'white', 'whiz', 'who', 'wholesale', 'wide', 'widget', 'wiki', 'wild', 'will', 'win', 'wind', 'window', 'windows', 'wine', 'wines', 'wing', 'wings', 'winner', 'wire', 'wired', 'wireless', 'wisdom', 'wise', 'wish', 'with', 'wiz', 'wizard', 'wizards', 'wolf', 'woman', 'women', 'wood', 'word', 'words', 'work', 'worker', 'works', 'workshop', 'world', 'worlds', 'worldwide', 'worth', 'worthy', 'worx', 'wow', 'wrap', 'write', 'writer', 'writers', 'writing', 'xchange', 'xpert', 'xpress', 'yard', 'yes', 'yoga', 'yourself', 'zen', 'zero', 'zilla', 'zip', 'zone', 'zones', 'zoo', 'zoom'],
    'Animals': ['Alligator', 'Ant', 'Antelope', 'Ape', 'Armadillo', 'Baboon', 'Badger', 'Bat', 'Bear', 'Beaver', 'Bee', 'Beetle', 'Bison', 'Boar', 'Buffalo', 'Butterfly', 'Camel', 'Capybara', 'Caribou', 'Cat', 'Caterpillar', 'Chameleon', 'Cheetah', 'Chicken', 'Chimp', 'Chipmunk', 'Clam', 'Cobra', 'Cockroach', 'Cod', 'Coyote', 'Crab', 'Crane', 'Cricket', 'Crocodile', 'Crow', 'Deer', 'Dingo', 'Dino', 'Dog', 'Dolphin', 'Donkey', 'Dove', 'Dragonfly', 'Duck', 'Eagle', 'Eel', 'Elephant', 'Elk', 'Emu', 'Falcon', 'Finch', 'Firefly', 'Fish', 'Flamingo', 'Fly', 'Fox', 'Frog', 'Gazelle', 'Gecko', 'Gerbil', 'Gibbon', 'Giraffe', 'Gnat', 'Goat', 'Goldfish', 'Goose', 'Gopher', 'Gorilla', 'Grasshopper', 'Gull', 'Hamster', 'Hare', 'Hawk', 'Hedgehog', 'Hippo', 'Hornet', 'Horse', 'Hummingbird', 'Hyena', 'Iguana', 'Jaguar', 'Jay', 'Jellyfish', 'Kangaroo', 'Kingfisher', 'Koala', 'KomodoDragon', 'Ladybug', 'Leopard', 'Lion', 'Lizard', 'Llama', 'Lobster', 'Lynx', 'Macaw', 'Manatee', 'Manta', 'Monkey', 'Moose', 'Mosquito', 'Moth', 'Mouse', 'Mule', 'Octopus', 'Orca', 'Ostrich', 'Otter', 'Owl', 'Oyster', 'Panther', 'Parrot', 'Peacock', 'Pelican', 'Penguin', 'Pig', 'Pigeon', 'Pony', 'Porcupine', 'Puma', 'Rabbit', 'Raccoon', 'Ram', 'Rat', 'Raven', 'Reindeer', 'Rhino', 'Roadrunner', 'Robin', 'Salamander', 'Salmon', 'Scorpion', 'Seahorse', 'Seal', 'Shark', 'Sheep', 'Shrimp', 'Skunk', 'Snake', 'Sparrow', 'Spider', 'Squid', 'Squirrel', 'Starfish', 'Swan', 'Tiger', 'Toad', 'Tortoise', 'Toucan', 'Tuna', 'Turkey', 'Turtle', 'Viper', 'Vulture', 'Walrus', 'Wasp', 'Whale', 'Wolf', 'Wolverine', 'Woodpecker', 'Zebra']
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
  const [openTldPopover, setOpenTldPopover] = useState(false);
  
  const searchCancelled = useRef(false);
  const [isSearching, setIsSearching] = useState(false);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      keywords1: "",
      keywords2: "",
      tlds: [".com"],
    },
  });
  
  const selectedTlds = form.watch('tlds');

  const handlePresetChange = (
    value: string,
    list: 'list1' | 'list2',
    onChange: (value: string) => void
  ) => {
    if (!value) return;
    const presets = list === 'list1' ? presetLists1 : presetLists2;
    const keywords = (presets as any)[value] || [];
    onChange(keywords.join(', '));
  };

  const formValues = form.watch();
  
  const splitKeywords = (keywords: string) => {
    return keywords.split(/[\n,]/).map(k => k.trim()).filter(Boolean);
  }

  useEffect(() => {
    const { keywords1, keywords2, tlds } = form.getValues();
    const list1 = splitKeywords(keywords1 || "");
    const list2 = splitKeywords(keywords2 || "");
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

    setIsSearching(true);
    setAvailableDomains([]);
    setUnavailableDomains([]);
    setProgress(0);
    setError(null);
    setCopiedDomain(null);
    searchCancelled.current = false;

    startTransition(async () => {
      try {
        const result: CheckDomainsResult = await checkDomains(values);

        if (searchCancelled.current) {
          toast({ title: "Search cancelled." });
          setIsSearching(false);
          return;
        }

        if (result.error) {
           setError(result.error);
           toast({ variant: "destructive", title: "Error", description: result.error });
        } else {
            const available = result.results.filter(d => d.status === 'available');
            const unavailable = result.results.filter(d => d.status !== 'available');
            setAvailableDomains(available);
            setUnavailableDomains(unavailable);
            toast({ title: "Search complete!", description: `Found ${available.length} available domains.` });
        }
        setProgress(result.progress);

      } catch (e) {
        if (!searchCancelled.current) {
          const errorMsg = e instanceof Error ? e.message : "An unknown error occurred.";
          setError(errorMsg);
          toast({ variant: "destructive", title: "An Error Occurred", description: errorMsg });
        }
      } finally {
        if (!searchCancelled.current) {
          setIsSearching(false);
        }
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

  const TldSearchableDropdown = () => (
      <Popover open={openTldPopover} onOpenChange={setOpenTldPopover}>
          <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openTldPopover} className="w-[200px] justify-between">
                  Search more TLDs...
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
              <Command>
                  <CommandInput placeholder="Search TLD..." />
                  <CommandEmpty>No TLD found.</CommandEmpty>
                  <CommandList>
                      <CommandGroup>
                          {secondaryTlds.map((tld) => (
                              <CommandItem
                                  key={tld}
                                  value={tld}
                                  onSelect={(currentValue) => {
                                      const currentTlds = form.getValues("tlds") || [];
                                      if (!currentTlds.includes(currentValue)) {
                                          form.setValue("tlds", [...currentTlds, currentValue]);
                                      }
                                      setOpenTldPopover(false);
                                  }}
                              >
                                  <Check className={`mr-2 h-4 w-4 ${selectedTlds.includes(tld) ? "opacity-100" : "opacity-0"}`} />
                                  {tld}
                              </CommandItem>
                          ))}
                      </CommandGroup>
                  </CommandList>
              </Command>
          </PopoverContent>
      </Popover>
  );

  const handleCancelSearch = () => {
    searchCancelled.current = true;
    setIsSearching(false);
    setProgress(0);
  };
  
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
                      <Textarea placeholder="cloud, data, web" {...field} rows={5} />
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
                      <Textarea placeholder="base, stack, flow" {...field} rows={5} />
                    </FormControl>
                    <FormDescription>Combine with List 1 to form names like 'cloudbase'.</FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tlds"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Top-Level Domains (TLDs)</FormLabel>
                    <FormDescription>Select which TLDs you want to check against.</FormDescription>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                      {primaryTlds.map((tld) => (
                          <FormItem key={tld} className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                  <Checkbox
                                      checked={field.value?.includes(tld)}
                                      onCheckedChange={(checked) => {
                                          const newValue = checked
                                              ? [...(field.value || []), tld]
                                              : field.value?.filter((value) => value !== tld);
                                          field.onChange(newValue);
                                      }}
                                  />
                              </FormControl>
                              <FormLabel className="font-normal">{tld}</FormLabel>
                          </FormItem>
                      ))}
                      <TldSearchableDropdown />
                  </div>
                   <div className="mt-4 flex flex-wrap gap-2">
                    {selectedTlds.filter(tld => !primaryTlds.includes(tld)).map(tld => (
                      <Badge key={tld} variant="secondary" className="pl-2 pr-1">
                        {tld}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 ml-1"
                          onClick={() => field.onChange(field.value?.filter(v => v !== tld))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
              <div className="flex items-center gap-4">
                <Button type="submit" size="lg" disabled={isSearching || totalChecks > MAX_DOMAINS || totalChecks === 0} className="w-full sm:w-auto btn-gradient">
                  {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {isSearching ? `Checking...` : "Seek Domains"}
                </Button>
                {isSearching && (
                  <Button type="button" size="lg" variant="outline" onClick={handleCancelSearch} className="w-full sm:w-auto">
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
              <div className={`text-sm ${totalChecks > MAX_DOMAINS ? 'text-red-500' : 'text-muted-foreground'}`}>
                {totalChecks} / {MAX_DOMAINS} domains
              </div>
            </div>
          </form>
        </Form>
      </div>

      {isSearching && (
        <div className="mt-12 px-2">
          <p className="text-sm text-center text-muted-foreground">Checking {totalChecks} domains. This may take a moment...</p>
        </div>
      )}
      
      {!isSearching && progress === 100 && (
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
