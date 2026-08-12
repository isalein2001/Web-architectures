CREATE TABLE `exercise_media` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `exercise_name` VARCHAR(191) NOT NULL,
    `image_path` VARCHAR(191) NOT NULL,
    `display_order` INTEGER NOT NULL,

    UNIQUE INDEX `exercise_media_exercise_name_key`(`exercise_name`),
    INDEX `exercise_media_display_order_idx`(`display_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `exercise_media` (`exercise_name`, `image_path`, `display_order`) VALUES
    ('Cable Biceps Curl', '/exercises/cable-biceps-curl.png', 34),
    ('Cable Chest Press', '/exercises/cable-chest-press.png', 35),
    ('Cable Crossover', '/exercises/cable-crossover.png', 36),
    ('Cable Face Pulls (Standing)', '/exercises/cable-face-pulls-standing.png', 37),
    ('Cable Face Pulls (Seated)', '/exercises/cable-face-pulls-seated.png', 38),
    ('Cable Fly', '/exercises/cable-fly.png', 39),
    ('Cable Front Raise', '/exercises/cable-front-raise.png', 40),
    ('Cable Glute Kickback', '/exercises/cable-glute-kickback.png', 41),
    ('Cable Hammer Curl', '/exercises/cable-hammer-curl.png', 42),
    ('Cable Lateral Raise', '/exercises/cable-lateral-raise.png', 43),
    ('Cable Pull-Through', '/exercises/cable-pull-through.png', 44),
    ('Cable Rear Delt Fly', '/exercises/cable-rear-delt-fly.png', 45),
    ('Cable Rope Overhead Triceps Extension', '/exercises/cable-rope-overhead-triceps-extension.png', 46),
    ('Cable Row', '/exercises/cable-row.png', 47),
    ('Cable Triceps Pushdown', '/exercises/cable-triceps-pushdown.png', 48),
    ('Cable Woodchop', '/exercises/cable-woodchop.png', 49),
    ('Calf Press', '/exercises/calf-press.png', 50),
    ('Captain Chair Knee Raise', '/exercises/captain-chair-knee-raise.png', 52),
    ('Chest Press Machine', '/exercises/chest-press-machine.png', 53),
    ('Chin-Up', '/exercises/chin-up.png', 54),
    ('Clean Pull', '/exercises/clean-pull.png', 55);
