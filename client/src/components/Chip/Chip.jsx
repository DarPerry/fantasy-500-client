import classNames from "classnames";

import styles from "./Chip.module.scss";
import Icon from "../Icon/Icon";

// Pill button; `variant` is a position (QB, RB, ...) for position colors
export const Chip = ({ active, onClick, children, variant, starred }) => (
    <button
        type="button"
        className={classNames(
            styles.chip,
            active && styles.active,
            variant && styles[variant]
        )}
        aria-pressed={active}
        onClick={onClick}
    >
        {starred && <Icon name="star" className={styles.star} />}
        {children}
    </button>
);

// Row of chips that scrolls sideways on phones and wraps on tablets.
// `fade` hints that more chips are off screen.
export const ChipRow = ({ children, fade }) => (
    <div className={classNames(styles.chips, fade && styles.fade)}>
        {children}
    </div>
);
