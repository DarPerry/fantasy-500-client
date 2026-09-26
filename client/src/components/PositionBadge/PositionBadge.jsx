import styles from "./PositionBadge.module.scss";

import classNames from "classnames";

const PositionBadge = ({ position }) => (
    <span className={classNames(styles.positionBadge, styles[position])}>
        {position}
    </span>
);

export default PositionBadge;
