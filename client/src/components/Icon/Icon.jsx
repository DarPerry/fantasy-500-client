import classNames from "classnames";

import styles from "./Icon.module.scss";
import { DUOTONE_ICONS, SOLID_ICONS } from "./icons";

// Inline SVG icon sized to the font (1em) and colored with currentColor.
// Wrapped in <i> so it can be styled like the old icon font.
const Icon = ({ name, duotone, className, label }) => {
    const icon = duotone ? DUOTONE_ICONS[name] : SOLID_ICONS[name];

    if (!icon) {
        console.warn(`Missing icon: ${name}`);
        return null;
    }

    return (
        <i
            className={classNames(styles.icon, className)}
            aria-hidden={label ? undefined : true}
            aria-label={label}
            role={label ? "img" : undefined}
        >
            <svg viewBox={icon.viewBox} focusable="false">
                {duotone ? (
                    <>
                        <path className={styles.secondary} d={icon.secondary} />
                        <path d={icon.primary} />
                    </>
                ) : (
                    <path d={icon.path} />
                )}
            </svg>
        </i>
    );
};

export default Icon;
