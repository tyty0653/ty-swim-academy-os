export const levelStatuses = ['not_started', 'learning', 'almost_ready', 'passed'];

export const progressStatuses = ['not_started', 'learning', 'almost', 'passed'];

export const levelStatusLabels = {
  not_started: 'Not Started',
  learning: 'Learning',
  almost_ready: 'Almost Ready',
  passed: 'Passed',
};

export const progressStatusLabels = {
  not_started: 'Not Started',
  learning: 'Learning',
  almost: 'Almost',
  passed: 'Passed',
};

export const skillLevels = [
  {
    level: 1,
    title: 'Water Safety / Floating / Survival Jump',
    goal: 'Student can enter/exit water safely, float, recover to standing, push & glide, kick, and survive jump to find pool edge.',
    teachingFocus: 'Water confidence, safe recovery, body line, breath control, floating, gliding, kicking, and pool-edge rescue habits.',
    commonMistakes: ['Holding breath too long', 'Standing up head first', 'Loose body line', 'Panic after jump', 'Forgetting to find the wall'],
    cues: ['Keep blowing in water, quick inhale', 'Ears close to arms, tummy tight, toes pointed', 'Find edge, hands first, feet on wall', 'Collect legs first, step down, head comes up last'],
    criteria: [
      ['safe_entry_exit', 'Safe water entry and exit'],
      ['bubble_breathing', 'Bubble blowing / breath control'],
      ['front_star_float_5s', 'Front star float at least 5 seconds'],
      ['back_star_float_5s', 'Back star float at least 5 seconds'],
      ['mushroom_float', 'Mushroom float'],
      ['float_to_stand', 'Float to stand recovery'],
      ['push_glide_3m', 'Push & Glide at least 3 m'],
      ['kick_board_5_10m', 'Kick with board at least 5-10 m'],
      ['survival_jump_edge', 'Survival jump and find pool edge'],
      ['safe_recovery_habit', 'Safety habit: collect legs first, step down, head comes up last'],
    ],
  },
  {
    level: 2,
    title: 'Freestyle',
    goal: 'Student can swim standard freestyle 15 m.',
    teachingFocus: 'Freestyle kick, side breathing, body rotation, arm recovery, and 15 m combined swim.',
    commonMistakes: ['Lifting head too high', 'Stopping kick to breathe', 'Wide arm recovery', 'No shoulder rotation', 'Slow heavy kicks'],
    cues: ['Shoulder rotation like a door hinge', 'Head stays close to arm', 'One goggle out of water', 'Blow underwater, quick low side breath', 'Small fast kicks'],
    criteria: [
      ['push_glide_kick_10m', 'Push & Glide kick 10 m without board'],
      ['kick_board_30m_breathing', 'Kick with board 30 m with breathing rhythm'],
      ['side_kick', 'Side kick'],
      ['side_kick_bubble_optional', 'Side kick + bubble breathing optional'],
      ['wall_breathing_lr', 'Wall breathing practice left/right'],
      ['single_arm_board_breathing', 'Single arm with board and side breathing'],
      ['double_arm_board_breathing', 'Double arm with board and side breathing'],
      ['combined_kick_pull_breath', 'Combined drill: kick + pull + turn head'],
      ['freestyle_15m', 'Freestyle 15 m'],
    ],
  },
  {
    level: 3,
    title: 'Backstroke',
    goal: 'Student can swim standard backstroke 15 m.',
    teachingFocus: 'Back body position, continuous kick, shoulder-led arm action, and freestyle maintenance.',
    commonMistakes: ['Sitting in water', 'Knees coming out', 'Flat shoulders', 'Arms crossing centre line', 'Looking at feet'],
    cues: ['Tummy up, do not sit', 'Look at ceiling/sky', 'Fingers brush ears', 'Shoulder moves first', 'Kick small and fast', 'Knees should not come out of water'],
    criteria: [
      ['back_kick_progression', 'Back kick progression: hold board -> board on knees -> board above head -> no board hands on thighs'],
      ['hands_behind_ears_kick_15m', 'Hand behind ears kicking 15 m'],
      ['thumb_exit_pinky_enter', 'Thumb exits, pinky enters'],
      ['one_arm_exit_other_pull', 'One arm exits while the other pulls'],
      ['6k1p_4k1p', '6k1p / 4k1p rhythm'],
      ['backstroke_15m', 'Backstroke 15 m'],
      ['freestyle_20m_maintenance', 'Freestyle 20 m maintenance'],
    ],
  },
  {
    level: 4,
    title: 'Breaststroke',
    goal: 'Student can swim standard breaststroke 15 m.',
    teachingFocus: 'Breaststroke kick shape, arm squeeze, breathing timing, glide, and stroke maintenance.',
    commonMistakes: ['Scissor kick', 'No glide', 'Pulling too wide', 'Hands and legs moving together too early', 'Feet not turned out'],
    cues: ['Turn out, collect, kick, close, glide', 'Hands first, legs second, glide', 'Close feet and glide 1-2 seconds', 'Propulsion comes from squeezing water'],
    criteria: [
      ['land_drill_wvi', 'Land drill W-V-I / collect-turn-kick-close'],
      ['board_breast_kick_15m', 'Board breaststroke kick 15 m'],
      ['no_board_breast_kick_15m', 'No-board breaststroke kick 15 m'],
      ['two_kicks_one_breath_board', '2 kicks 1 breath with board'],
      ['wo_squeeze_propulsion', 'Understand W-O / squeezing water for propulsion'],
      ['breaststroke_arms', 'Breaststroke arms'],
      ['combined_breast_timing', 'Combined breaststroke timing'],
      ['breaststroke_15m', 'Breaststroke 15 m'],
      ['backstroke_20m', 'Backstroke 20 m'],
      ['freestyle_25m', 'Freestyle 25 m'],
    ],
  },
  {
    level: 5,
    title: 'Butterfly',
    goal: 'Student can swim standard butterfly 15 m.',
    teachingFocus: 'Dolphin rhythm, chest-led wave, butterfly pull, low breath, and stroke maintenance.',
    commonMistakes: ['Kicking from knees only', 'Head returns late', 'Breathing too high', 'Feet kick too high', 'Over-bending body'],
    cues: ['Chest leads the wave', 'Like a whip from chest to feet', 'Early head return', 'Low breath', 'Do not over-bend or kick feet too high'],
    criteria: [
      ['dolphin_board_15m', 'Dolphin kick with board 15 m'],
      ['dolphin_no_board_15m', 'Dolphin kick no board 15 m'],
      ['wall_fly_pull_sequence', 'Wall butterfly pull sequence: press out -> pull in -> push -> recover'],
      ['fly_arms_with_without_board', 'Butterfly arms with/without board'],
      ['single_arm_fly_two_kicks_15m', 'Single-arm butterfly + two kicks 15 m'],
      ['butterfly_15m', 'Butterfly 15 m'],
      ['breaststroke_20m', 'Breaststroke 20 m'],
      ['backstroke_25m', 'Backstroke 25 m'],
      ['freestyle_30m', 'Freestyle 30 m'],
    ],
  },
  {
    level: 6,
    title: 'Master Squad / Competition Skills / IM',
    goal: 'Student can complete 100 m individual medley, 25 m each stroke, following competition-style rules.',
    teachingFocus: 'Legal starts, turns, finishes, stroke efficiency, underwater streamline, and IM order.',
    commonMistakes: ['Illegal touch/finish', 'Weak streamline', 'Late turns', 'No high elbow catch', 'Wrong IM transition habits'],
    cues: ['Streamline tight', 'Legal touch before turn', 'Finish clean', 'High elbow catch', 'IM order: fly, back, breast, free'],
    criteria: [
      ['free_high_elbow_catch', 'Freestyle high elbow / catch'],
      ['competition_dive_free_fly_breast', 'Competition dive for free/fly/breast'],
      ['backstroke_water_start', 'Backstroke water start'],
      ['freestyle_flip_turn', 'Freestyle flip turn'],
      ['backstroke_turn', 'Backstroke turn'],
      ['breast_fly_two_hand_turns', 'Breaststroke and butterfly two-hand touch turns'],
      ['legal_finishes', 'Legal finishes'],
      ['50m_each_stroke', '50 m each stroke'],
      ['100m_im', '100 m IM: butterfly, backstroke, breaststroke, freestyle, 25 m each'],
      ['underwater_streamline_7_10m', 'Underwater streamline 7-10 m'],
    ],
  },
];

export const bonusSkills = [
  {
    id: 'reverse_breaststroke',
    title: 'Reverse Breaststroke',
    notes: 'Back floating breaststroke kick. Focus on collect-turn-close-glide. Useful for breaststroke leg correction.',
  },
  {
    id: 'head_up_breaststroke',
    title: 'Head-up Breaststroke',
    notes: 'For safety, visibility, open water, and play. Useful after Level 4 or for safety theme lessons, but not the final technical standard.',
  },
];

export function getSkillLevel(level) {
  return skillLevels.find((item) => item.level === Number(level)) || skillLevels[0];
}
