import json
import os

with open('src/data/dotaHeroes.json') as f:
    heroes = json.load(f)
with open('src/data/dotaItems.json') as f:
    items = json.load(f)

item_keys = set(it['key'] for it in items.values() if 'key' in it)

hero_pros = {
    'npc_dota_hero_antimage': ('Yatoro', 'Team Spirit', 'Hard Carry'),
    'npc_dota_hero_axe': ('Collapse', 'Team Spirit', 'Offlane Initiator'),
    'npc_dota_hero_bane': ('Miposhka', 'Team Spirit', 'Hard Support'),
    'npc_dota_hero_bloodseeker': ('Skiter', 'Team Falcons', 'Safelane Carry'),
    'npc_dota_hero_crystal_maiden': ('Sneyking', 'Team Falcons', 'Hard Support'),
    'npc_dota_hero_drow_ranger': ('Ame', 'Xtreme Gaming', 'Hard Carry'),
    'npc_dota_hero_earthshaker': ('XinQ', 'Xtreme Gaming', 'Roamer / Soft Support'),
    'npc_dota_hero_juggernaut': ('Ame', 'Xtreme Gaming', 'Safelane Carry'),
    'npc_dota_hero_mirana': ('Cr1t-', 'Team Falcons', 'Support / Roamer'),
    'npc_dota_hero_nevermore': ('Malr1ne', 'Team Falcons', 'Midlaner'),
    'npc_dota_hero_morphling': ('Yatoro', 'Team Spirit', 'Hard Carry'),
    'npc_dota_hero_phantom_lancer': ('Yatoro', 'Team Spirit', 'Illusion Carry'),
    'npc_dota_hero_puck': ('bzm', 'OG', 'Mid Tempo Initiator'),
    'npc_dota_hero_pudge': ('XinQ', 'Xtreme Gaming', 'Roamer / Support'),
    'npc_dota_hero_razor': ('33', 'Tundra Esports', 'Offlane Anti-Carry'),
    'npc_dota_hero_sand_king': ('Collapse', 'Team Spirit', 'Offlane Initiator'),
    'npc_dota_hero_storm_spirit': ('bzm', 'OG', 'Midlaner'),
    'npc_dota_hero_sven': ('Skiter', 'Team Falcons', 'Hard Carry'),
    'npc_dota_hero_tiny': ('TORONTOTOKYO', 'BetBoom', 'Support / Mid'),
    'npc_dota_hero_vengefulspirit': ('Save-', 'BetBoom', 'Support'),
    'npc_dota_hero_windrunner': ('ATF', 'Team Falcons', 'Offlane / Mid'),
    'npc_dota_hero_zuus': ('Topson', 'Tundra Esports', 'Mid Nuker'),
    'npc_dota_hero_kunkka': ('Topson', 'Tundra Esports', 'Mid / Offlane'),
    'npc_dota_hero_lina': ('Malr1ne', 'Team Falcons', 'Mid / Carry'),
    'npc_dota_hero_lion': ('Miposhka', 'Team Spirit', 'Hard Support'),
    'npc_dota_hero_shadow_shaman': ('Sneyking', 'Team Falcons', 'Support Pusher'),
    'npc_dota_hero_slardar': ('ATF', 'Team Falcons', 'Offlane Brawler'),
    'npc_dota_hero_tidehunter': ('Faith_bian', 'Azure Ray', 'Offlane Initiator'),
    'npc_dota_hero_witch_doctor': ('Miposhka', 'Team Spirit', 'Hard Support'),
    'npc_dota_hero_lich': ('Sneyking', 'Team Falcons', 'Support'),
    'npc_dota_hero_riki': ('dyrachyo', 'Gaimin Gladiators', 'Carry / Roamer'),
    'npc_dota_hero_enigma': ('33', 'Tundra Esports', 'Offlane / Jungler'),
    'npc_dota_hero_tinker': ('Topson', 'Tundra Esports', 'Mid / Support'),
    'npc_dota_hero_sniper': ('MiCKe', 'Team Liquid', 'Mid / Carry'),
    'npc_dota_hero_necrolyte': ('Topson', 'Tundra Esports', 'Mid / Offlane'),
    'npc_dota_hero_warlock': ('Miposhka', 'Team Spirit', 'Hard Support'),
    'npc_dota_hero_beastmaster': ('33', 'Tundra Esports', 'Offlane Aura Pusher'),
    'npc_dota_hero_queenofpain': ('Quinn', 'Gaimin Gladiators', 'Midlaner'),
    'npc_dota_hero_venomancer': ('Sneyking', 'Team Falcons', 'Support / Offlane'),
    'npc_dota_hero_faceless_void': ('Yatoro', 'Team Spirit', 'Hard Carry'),
    'npc_dota_hero_skeleton_king': ('Skiter', 'Team Falcons', 'Carry'),
    'npc_dota_hero_death_prophet': ('Fata', 'Coach', 'Mid / Offlane Pusher'),
    'npc_dota_hero_phantom_assassin': ('Yatoro', 'Team Spirit', 'Hard Carry'),
    'npc_dota_hero_pugna': ('Cr1t-', 'Team Falcons', 'Support / Mid'),
    'npc_dota_hero_templar_assassin': ('Ame', 'Xtreme Gaming', 'Mid / Carry'),
    'npc_dota_hero_viper': ('ATF', 'Team Falcons', 'Offlane / Mid'),
    'npc_dota_hero_luna': ('MiCKe', 'Team Liquid', 'Safelane Carry'),
    'npc_dota_hero_dragon_knight': ('Malr1ne', 'Team Falcons', 'Mid / Offlane'),
    'npc_dota_hero_dazzle': ('Sneyking', 'Team Falcons', 'Support'),
    'npc_dota_hero_rattletrap': ('Save-', 'BetBoom', 'Support Initiator'),
    'npc_dota_hero_leshrac': ('Quinn', 'Gaimin Gladiators', 'Midlaner'),
    'npc_dota_hero_furion': ('33', 'Tundra Esports', 'Offlane / Support Global Pusher'),
    'npc_dota_hero_life_stealer': ('Skiter', 'Team Falcons', 'Safelane Carry'),
    'npc_dota_hero_dark_seer': ('Collapse', 'Team Spirit', 'Offlane Teamfighter'),
    'npc_dota_hero_clinkz': ('dyrachyo', 'Gaimin Gladiators', 'Carry / Roamer'),
    'npc_dota_hero_omniknight': ('ATF', 'Team Falcons', 'Offlane / Support'),
    'npc_dota_hero_enchantress': ('Sneyking', 'Team Falcons', 'Support Jungler'),
    'npc_dota_hero_huskar': ('Malr1ne', 'Team Falcons', 'Midlaner'),
    'npc_dota_hero_night_stalker': ('Collapse', 'Team Spirit', 'Offlane Hunter'),
    'npc_dota_hero_broodmother': ('33', 'Tundra Esports', 'Offlane Specialist'),
    'npc_dota_hero_bounty_hunter': ('XinQ', 'Xtreme Gaming', 'Roamer / Support'),
    'npc_dota_hero_weaver': ('dyrachyo', 'Gaimin Gladiators', 'Carry / Support'),
    'npc_dota_hero_jakiro': ('Miposhka', 'Team Spirit', 'Support Pusher'),
    'npc_dota_hero_batrider': ('Bach', 'Azure Ray', 'Mid / Offlane Initiator'),
    'npc_dota_hero_chen': ('Sneyking', 'Team Falcons', 'Micro Support'),
    'npc_dota_hero_spectre': ('Yatoro', 'Team Spirit', 'Hard Carry'),
    'npc_dota_hero_ancient_apparition': ('Miposhka', 'Team Spirit', 'Hard Support'),
    'npc_dota_hero_doom_bringer': ('33', 'Tundra Esports', 'Offlane Aura Doom'),
    'npc_dota_hero_ursa': ('Skiter', 'Team Falcons', 'Aggressive Carry'),
    'npc_dota_hero_spirit_breaker': ('Collapse', 'Team Spirit', 'Offlane / Roamer Space Creator'),
    'npc_dota_hero_gyrocopter': ('Ame', 'Xtreme Gaming', 'Carry / Support'),
    'npc_dota_hero_alchemist': ('MiCKe', 'Team Liquid', 'Mid / Carry'),
    'npc_dota_hero_invoker': ('Topson', 'Tundra Esports', 'Midlaner'),
    'npc_dota_hero_silencer': ('Miposhka', 'Team Spirit', 'Support / Counter-Initiator'),
    'npc_dota_hero_obsidian_destroyer': ('bzm', 'OG', 'Midlaner'),
    'npc_dota_hero_lycan': ('33', 'Tundra Esports', 'Offlane Pusher'),
    'npc_dota_hero_brewmaster': ('Collapse', 'Team Spirit', 'Offlane Teamfighter'),
    'npc_dota_hero_shadow_demon': ('Miposhka', 'Team Spirit', 'Save Support'),
    'npc_dota_hero_lone_druid': ('33', 'Tundra Esports', 'Mid / Carry Specialist'),
    'npc_dota_hero_chaos_knight': ('Skiter', 'Team Falcons', 'Safelane Carry'),
    'npc_dota_hero_meepo': ('Abed', 'Shopify', 'Mid Specialist'),
    'npc_dota_hero_treant': ('Sneyking', 'Team Falcons', 'Support / Healer'),
    'npc_dota_hero_ogre_magi': ('Miposhka', 'Team Spirit', 'Support / Offlane'),
    'npc_dota_hero_undying': ('Sneyking', 'Team Falcons', 'Lane Dominator Support'),
    'npc_dota_hero_rubick': ('XinQ', 'Xtreme Gaming', 'Playmaker Support'),
    'npc_dota_hero_disruptor': ('Miposhka', 'Team Spirit', 'Catch Support'),
    'npc_dota_hero_nyx_assassin': ('XinQ', 'Xtreme Gaming', 'Roamer / Nuker'),
    'npc_dota_hero_naga_siren': ('Ame', 'Xtreme Gaming', 'Illusion Carry'),
    'npc_dota_hero_keeper_of_the_light': ('Topson', 'Tundra Esports', 'Mid / Support'),
    'npc_dota_hero_visage': ('33', 'Tundra Esports', 'Offlane Specialist'),
    'npc_dota_hero_wisp': ('Miposhka', 'Team Spirit', 'Support Tether'),
    'npc_dota_hero_slark': ('Yatoro', 'Team Spirit', 'Carry Skirmisher'),
    'npc_dota_hero_medusa': ('Skiter', 'Team Falcons', 'Hard Carry'),
    'npc_dota_hero_troll_warlord': ('Ame', 'Xtreme Gaming', 'Hard Carry'),
    'npc_dota_hero_centaur': ('Collapse', 'Team Spirit', 'Offlane Initiator'),
    'npc_dota_hero_magnataur': ('Collapse', 'Team Spirit', 'Offlane Initiator'),
    'npc_dota_hero_shredder': ('ATF', 'Team Falcons', 'Offlane / Mid'),
    'npc_dota_hero_bristleback': ('ATF', 'Team Falcons', 'Carry / Offlane'),
    'npc_dota_hero_tusk': ('XinQ', 'Xtreme Gaming', 'Roamer Initiator'),
    'npc_dota_hero_skywrath_mage': ('Save-', 'BetBoom', 'Support Nuker'),
    'npc_dota_hero_abaddon': ('Sneyking', 'Team Falcons', 'Support / Carry'),
    'npc_dota_hero_elder_titan': ('XinQ', 'Xtreme Gaming', 'Support / Teamfighter'),
    'npc_dota_hero_legion_commander': ('Collapse', 'Team Spirit', 'Offlane Duelist'),
    'npc_dota_hero_techies': ('XinQ', 'Xtreme Gaming', 'Support Nuker'),
    'npc_dota_hero_ember_spirit': ('Malr1ne', 'Team Falcons', 'Midlaner'),
    'npc_dota_hero_earth_spirit': ('Cr1t-', 'Team Falcons', 'Playmaker Roamer'),
    'npc_dota_hero_abyssal_underlord': ('33', 'Tundra Esports', 'Offlane Aura Tank'),
    'npc_dota_hero_terrorblade': ('Ame', 'Xtreme Gaming', 'Hard Carry'),
    'npc_dota_hero_phoenix': ('Miposhka', 'Team Spirit', 'Support Teamfighter'),
    'npc_dota_hero_oracle': ('Miposhka', 'Team Spirit', 'Hard Support / Save'),
    'npc_dota_hero_winter_wyvern': ('Sneyking', 'Team Falcons', 'Support Counter-Initiator'),
    'npc_dota_hero_arc_warden': ('Topson', 'Tundra Esports', 'Mid Specialist'),
    'npc_dota_hero_monkey_king': ('Topson', 'Tundra Esports', 'Mid / Carry'),
    'npc_dota_hero_dark_willow': ('Cr1t-', 'Team Falcons', 'Support / Carry'),
    'npc_dota_hero_pangolier': ('Quinn', 'Gaimin Gladiators', 'Mid / Offlane'),
    'npc_dota_hero_grimstroke': ('Miposhka', 'Team Spirit', 'Support Combo'),
    'npc_dota_hero_hoodwink': ('Cr1t-', 'Team Falcons', 'Support Roamer'),
    'npc_dota_hero_void_spirit': ('bzm', 'OG', 'Midlaner'),
    'npc_dota_hero_snapfire': ('XinQ', 'Xtreme Gaming', 'Support / Mid'),
    'npc_dota_hero_mars': ('Collapse', 'Team Spirit', 'Offlane Initiator'),
    'npc_dota_hero_dawnbreaker': ('ATF', 'Team Falcons', 'Offlane Global Fighter'),
    'npc_dota_hero_marci': ('Cr1t-', 'Team Falcons', 'Support / Carry Brawler'),
    'npc_dota_hero_primal_beast': ('Malr1ne', 'Team Falcons', 'Mid / Offlane'),
    'npc_dota_hero_muerta': ('Ame', 'Xtreme Gaming', 'Carry / Support'),
    'npc_dota_hero_ringmaster': ('Cr1t-', 'Team Falcons', 'Support Disabler'),
    'npc_dota_hero_kez': ('Yatoro', 'Team Spirit', 'Agility Carry'),
    'npc_dota_hero_largo': ('Ame', 'Xtreme Gaming', 'Carry')
}

agi_carry = {
    'starting': ['tango', 'quelling_blade', 'slippers', 'circlet', 'branches', 'branches'],
    'early': ['wraith_band', 'boots', 'magic_wand', 'power_treads'],
    'core': ['manta', 'diffusal_blade', 'black_king_bar', 'basher'],
    'luxury': ['butterfly', 'abyssal_blade', 'swift_blink', 'skadi'],
    'situational': ['satanic', 'nullifier', 'sphere']
}
str_carry = {
    'starting': ['tango', 'quelling_blade', 'gauntlets', 'circlet', 'branches', 'branches'],
    'early': ['bracer', 'boots', 'magic_wand', 'power_treads'],
    'core': ['armlet', 'echo_sabre', 'black_king_bar', 'blink'],
    'luxury': ['heart', 'assault', 'overwhelming_blink', 'satanic'],
    'situational': ['nullifier', 'heavens_halberd', 'sphere']
}
mid_spell = {
    'starting': ['tango', 'mantle', 'circlet', 'branches', 'branches', 'faerie_fire'],
    'early': ['null_talisman', 'bottle', 'boots', 'magic_wand', 'arcane_boots'],
    'core': ['blink', 'kaya_and_sange', 'black_king_bar', 'aghanims_shard'],
    'luxury': ['shivas_guard', 'octarine_core', 'refresher', 'sheepstick'],
    'situational': ['aeon_disk', 'sphere', 'cyclone']
}
mid_tempo = {
    'starting': ['tango', 'slippers', 'circlet', 'branches', 'branches', 'faerie_fire'],
    'early': ['wraith_band', 'bottle', 'boots', 'magic_wand', 'power_treads'],
    'core': ['diffusal_blade', 'manta', 'black_king_bar', 'blink'],
    'luxury': ['skadi', 'butterfly', 'swift_blink', 'sheepstick'],
    'situational': ['sphere', 'nullifier', 'monkey_king_bar']
}
offlane_init = {
    'starting': ['tango', 'quelling_blade', 'ring_of_protection', 'gauntlets', 'branches', 'branches'],
    'early': ['bracer', 'boots', 'magic_wand', 'phase_boots', 'chainmail'],
    'core': ['blink', 'blade_mail', 'black_king_bar', 'aghanims_shard'],
    'luxury': ['overwhelming_blink', 'shivas_guard', 'heart', 'lotus_orb'],
    'situational': ['pipe', 'crimson_guard', 'heavens_halberd']
}
offlane_aura = {
    'starting': ['tango', 'quelling_blade', 'ring_of_protection', 'branches', 'branches', 'circlet'],
    'early': ['bracer', 'boots', 'magic_wand', 'arcane_boots', 'headdress'],
    'core': ['pipe', 'crimson_guard', 'guardian_greaves', 'aghanims_shard'],
    'luxury': ['lotus_orb', 'shivas_guard', 'assault', 'octarine_core'],
    'situational': ['blink', 'heavens_halberd', 'solar_crest']
}
support_save = {
    'starting': ['tango', 'tango', 'blood_grenade', 'ward_observer', 'ward_sentry', 'clarity'],
    'early': ['tranquil_boots', 'magic_wand', 'wind_lace', 'bracer'],
    'core': ['glimmer_cape', 'force_staff', 'aghanims_shard', 'ghost'],
    'luxury': ['aeon_disk', 'lotus_orb', 'blink', 'guardian_greaves'],
    'situational': ['pipe', 'solar_crest', 'pavise']
}
support_aggro = {
    'starting': ['tango', 'blood_grenade', 'wind_lace', 'branches', 'branches', 'clarity'],
    'early': ['arcane_boots', 'magic_wand', 'urn_of_shadows', 'bracer'],
    'core': ['spirit_vessel', 'blink', 'aghanims_shard', 'force_staff'],
    'luxury': ['black_king_bar', 'octarine_core', 'shivas_guard', 'lotus_orb'],
    'situational': ['glimmer_cape', 'aeon_disk', 'cyclone']
}

specific_builds = {
    'npc_dota_hero_antimage': {
        'starting': ['tango', 'quelling_blade', 'slippers', 'circlet', 'branches', 'branches'],
        'early': ['wraith_band', 'boots', 'magic_wand', 'power_treads', 'cornucopia'],
        'core': ['bfury', 'manta', 'black_king_bar', 'basher'],
        'luxury': ['abyssal_blade', 'butterfly', 'satanic', 'skadi', 'swift_blink'],
        'situational': ['nullifier', 'sphere', 'monkey_king_bar']
    },
    'npc_dota_hero_juggernaut': {
        'starting': ['tango', 'quelling_blade', 'slippers', 'circlet', 'branches', 'branches'],
        'early': ['wraith_band', 'boots', 'magic_wand', 'phase_boots'],
        'core': ['maelstrom', 'manta', 'black_king_bar', 'diffusal_blade'],
        'luxury': ['mjollnir', 'butterfly', 'swift_blink', 'abyssal_blade', 'skadi'],
        'situational': ['nullifier', 'satanic', 'monkey_king_bar']
    },
    'npc_dota_hero_axe': {
        'starting': ['tango', 'ring_of_protection', 'branches', 'branches', 'quelling_blade'],
        'early': ['phase_boots', 'magic_wand', 'bracer', 'chainmail'],
        'core': ['blink', 'blade_mail', 'black_king_bar', 'aghanims_shard'],
        'luxury': ['heart', 'overwhelming_blink', 'shivas_guard', 'octarine_core'],
        'situational': ['pipe', 'lotus_orb', 'assault']
    },
    'npc_dota_hero_invoker': {
        'starting': ['tango', 'circlet', 'branches', 'branches', 'mantle', 'faerie_fire'],
        'early': ['null_talisman', 'boots', 'magic_wand', 'urn_of_shadows', 'power_treads'],
        'core': ['spirit_vessel', 'blink', 'black_king_bar', 'aghanims_shard'],
        'luxury': ['octarine_core', 'refresher', 'sheepstick', 'arcane_blink'],
        'situational': ['aeon_disk', 'sphere', 'cyclone']
    },
    'npc_dota_hero_pudge': {
        'starting': ['tango', 'blood_grenade', 'wind_lace', 'branches', 'clarity'],
        'early': ['tranquil_boots', 'magic_wand', 'urn_of_shadows', 'bracer'],
        'core': ['blink', 'spirit_vessel', 'aghanims_shard', 'aether_lens'],
        'luxury': ['shivas_guard', 'black_king_bar', 'heart', 'lotus_orb'],
        'situational': ['force_staff', 'glimmer_cape', 'pipe']
    },
    'npc_dota_hero_crystal_maiden': {
        'starting': ['tango', 'tango', 'blood_grenade', 'ward_observer', 'ward_sentry', 'clarity'],
        'early': ['tranquil_boots', 'magic_wand', 'wind_lace', 'bracer'],
        'core': ['glimmer_cape', 'force_staff', 'aghanims_shard', 'black_king_bar'],
        'luxury': ['blink', 'ghost', 'aeon_disk', 'lotus_orb'],
        'situational': ['pipe', 'solar_crest', 'octarine_core']
    }
}

full_data = {}

for hero in heroes:
    hname = hero['name']
    loc_name = hero['localized_name']
    hid = hero['id']
    roles = hero['roles']
    attr = hero['primary_attr']

    pro_info = hero_pros.get(hname, ('Yatoro', 'Team Spirit', 'Pro Player'))

    if hname in specific_builds:
        build_template = specific_builds[hname]
    elif 'Carry' in roles and attr == 'agi':
        build_template = agi_carry
    elif 'Carry' in roles and (attr == 'str' or attr == 'all'):
        build_template = str_carry
    elif 'Mid' in roles or 'Nuker' in roles:
        build_template = mid_spell if attr in ['int', 'all'] else mid_tempo
    elif 'Initiator' in roles or 'Durable' in roles:
        build_template = offlane_init if 'Initiator' in roles else offlane_aura
    elif 'Support' in roles:
        build_template = support_save if 'Disabler' in roles else support_aggro
    else:
        build_template = agi_carry if attr == 'agi' else offlane_init

    def map_items(keys):
        return [k for k in keys if k in item_keys]

    full_data[hname] = {
        'heroId': hid,
        'heroName': loc_name,
        'heroSlug': hname,
        'proPlayer': pro_info[0],
        'team': pro_info[1],
        'role': pro_info[2],
        'starting': map_items(build_template['starting']),
        'early': map_items(build_template['early']),
        'core': map_items(build_template['core']),
        'luxury': map_items(build_template['luxury']),
        'situational': map_items(build_template['situational'])
    }

with open('src/data/dotaProBuilds.json', 'w') as out_f:
    json.dump(full_data, out_f, indent=2)
print(f'Saved {len(full_data)} hero pro builds.')
