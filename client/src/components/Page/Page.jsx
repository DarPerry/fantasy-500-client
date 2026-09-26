import styles from "./Page.module.scss";

import classNames from "classnames";
import Icon from "../Icon/Icon";

const Page = ({ isLoading, hasError, onRetry, narrow, children }) => {
    if (hasError) {
        return (
            <div className={styles.loader}>
                <Icon
                    name="triangle-exclamation"
                    duotone
                    className={styles.loaderIcon}
                />
                <div className={styles.loaderText}>
                    Couldn't load league data
                </div>
                <button
                    type="button"
                    className={styles.retry}
                    onClick={onRetry}
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className={styles.loader}>
                <Icon
                    name="football"
                    duotone
                    className={classNames(styles.loaderIcon, styles.bounce)}
                />
                <div className={styles.loaderText}>Loading league data…</div>
                <div className={styles.loaderHint}>
                    This can take up to a minute if the server is waking up.
                </div>
            </div>
        );
    }

    return (
        <main className={classNames(styles.page, narrow && styles.narrow)}>
            {children}
        </main>
    );
};

export default Page;
