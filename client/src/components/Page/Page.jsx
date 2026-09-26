import styles from "./Page.module.scss";

import classNames from "classnames";

const Page = ({ isLoading, hasError, onRetry, narrow, children }) => {
    if (hasError) {
        return (
            <div className={styles.loader}>
                <i
                    className={classNames(
                        "fa-duotone fa-triangle-exclamation",
                        styles.loaderIcon
                    )}
                />
                <div className={styles.loaderText}>
                    Couldn't load keeper data
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
                <i
                    className={classNames(
                        "fa-duotone fa-football fa-bounce",
                        styles.loaderIcon
                    )}
                />
                <div className={styles.loaderText}>Loading keeper data…</div>
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
