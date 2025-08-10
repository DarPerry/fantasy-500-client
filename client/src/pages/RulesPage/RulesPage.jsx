import classNames from "classnames";

import Page from "../../components/Page/Page";
import styles from "../RulesPage.module.scss";
import { useState } from "react";

// const styles = {};

//https://draftysports.com/news/you-deserve-better-defense-scoring#tldr
//https://www.thefantasyfootballers.com/articles/ballers-preferred-league-format/

// eslint-disable-next-line react/prop-types
const RuleCard = ({ children, title }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={styles.rule} onClick={() => setIsOpen(!isOpen)}>
            <div className={styles.title}>
                <i
                    className={classNames(
                        `fa fa-${isOpen ? "minus" : "plus"}`,
                        styles.icon
                    )}
                />
                <div>{title}</div>
            </div>
            {isOpen && <div className={styles.body}>{children}</div>}
        </div>
    );
};

const NewBadge = ({ isNew, isUpdated, isProposed }) => {
    if (isProposed)
        return (
            <div className={classNames(styles.newBadge, styles.proposed)}>
                PROPOSED
            </div>
        );

    return <div className={styles.newBadge}>{isNew ? "NEW" : "UPDATE"}</div>;
};

const RulesList = ({ header, children, showDivider }) => {
    return (
        <div className={classNames(showDivider && styles.divided)}>
            {header && <div className={styles.listHeader}>{header}</div>}
            <ul className={styles.list}>{children}</ul>
        </div>
    );
};

const RulesListItem = ({ text, bolded, isNew, isUpdated, isProposed }) => {
    const Badge = () => {
        if (isProposed) return <NewBadge isProposed />;
        if (isNew) return <NewBadge isNew />;
        if (isUpdated) return <NewBadge isUpdated />;
        return null;
    };
    return (
        <div className={styles.listItem}>
            <div className={styles.bullet} />
            <Badge />

            <div className={styles.text}>
                {text}
                {bolded && (
                    <>
                        : <b className={styles.bolded}>{bolded}</b>
                    </>
                )}
            </div>
        </div>
    );
};

const RulesPage = () => {
    return (
        <Page>
            <RuleCard title={"Entry Fee & Payouts"}>
                <RulesList>
                    <RulesListItem text={"Entry Cost"} bolded={"$50"} />
                    <RulesListItem text={"Champion"} bolded={"$400"} />
                    <RulesListItem text={"Runner-Up"} bolded={"$125"} />
                    <RulesListItem
                        isUpdated
                        text={"Manager of Highest Scoring Game"}
                        bolded={"$75"}
                    />
                </RulesList>
            </RuleCard>
            <RuleCard title={"Scoring"}>
                <RulesList header="Passing" showDivider>
                    <RulesListItem
                        text={"Passing Yards"}
                        bolded={"0.04 per Yard / 1 per 25 Yards"}
                    />
                    <RulesListItem text={"Passing TD"} bolded={6} />
                    <RulesListItem text={"Pass Intercepted"} bolded={-2} />
                    <RulesListItem text={"2-PT Conversion"} bolded={2} />
                    <RulesListItem text={"Pass Completed"} bolded={0.1} />
                    <RulesListItem text={"40+ Yard TD Bonus"} bolded={2} />
                    {/* <RulesListItem text={"Pick 6 Thrown"} bolded={-2} isNew /> */}
                </RulesList>
                <RulesList header="Rushing" showDivider>
                    <RulesListItem
                        text={"Rushing Yards"}
                        bolded={"0.1 per Yard / 1 per 10 Yards"}
                    />
                    <RulesListItem text={"Rushing TD"} bolded={6} />
                    <RulesListItem text={"2-PT Conversion"} bolded={2} />
                    <RulesListItem text={"Rush Attempts"} bolded={0.15} />
                    <RulesListItem text={"40+ Yard TD Bonus"} bolded={2} />
                </RulesList>
                <RulesList header="Receiving" showDivider>
                    <RulesListItem
                        text={"Receiving Yards"}
                        bolded={"0.1 per Yard / 1 per 10 Yards"}
                    />
                    <RulesListItem text={"Receiving TD"} bolded={6} />
                    <RulesListItem text={"2-PT Conversion"} bolded={2} />
                    <RulesListItem text={"Reception"} bolded={0.5} isUpdated />
                    <RulesListItem text={"40+ Yard TD Bonus"} bolded={2} />

                    {/* <RulesListItem
                        text={"TE Reception Bonus"}
                        bolded={0.5}
                        isProposed
                    /> */}
                </RulesList>
                <RulesList header="Kicking" showDivider>
                    <RulesListItem text={"PAT Made"} bolded={1} />
                    <RulesListItem text={"PAT Missed"} bolded={-3} />
                    <RulesListItem text={"Points per FG yard"} bolded={0.1} />
                    <RulesListItem text={"FG Missed"} bolded={-2} />
                </RulesList>
                <RulesList header="Team Defense" showDivider>
                    <RulesListItem text={"Defense TD"} bolded={6} />
                    <RulesListItem text={"Safety"} bolded={4} />
                    <RulesListItem
                        text={"2-PT Conversion Returns"}
                        bolded={4}
                    />
                    <RulesListItem text={"Blocked Kick"} bolded={3} />
                    <RulesListItem text={"Interceptions"} bolded={2} />
                    <RulesListItem text={"Fumble Recovery"} bolded={1} />
                    <RulesListItem text={"Forced Fumble"} bolded={1} />
                    <RulesListItem text={"Sack"} bolded={1} />

                    <RulesListItem text={"Tackle For Loss"} bolded={0.5} />
                    <RulesListItem text={"Passed Defended"} bolded={0.25} />
                    <RulesListItem text={"3 and Out"} bolded={0.5} />
                    <RulesListItem text={"4th Down Stop"} bolded={1} />

                    <RulesListItem
                        text={"Points Allowed"}
                        bolded={"-0.4 per Point"}
                    />
                    <RulesListItem
                        text={"Yards Allowed"}
                        bolded={"-0.02 per Yard"}
                    />
                </RulesList>
                <RulesList header="Special Teams" showDivider>
                    <RulesListItem text={"Special Teams TD"} bolded={8} />
                    <RulesListItem
                        text={"Special Teams Forced Fumble"}
                        bolded={1}
                    />
                    <RulesListItem
                        text={"Special Teams Fumble Recovery"}
                        bolded={1}
                    />
                </RulesList>
                <RulesList header="Miscellaneous">
                    <RulesListItem text={"Fumble"} bolded={-1} />
                    <RulesListItem text={"Fumble Lost"} bolded={-1} />
                    <RulesListItem text={"Fumble Recovery TD"} bolded={6} />
                </RulesList>
            </RuleCard>

            <RuleCard title={"Keeper Rules"}>
                <RulesList header="Overview" showDivider>
                    <RulesListItem
                        text={
                            "Each season, you will select up to 4 players to potentially be kept."
                        }
                    />

                    <RulesListItem
                        text={
                            "You can designate one player to not be included in the Keeper Lottery, guaranteeing that player will be on your team."
                        }
                    />
                    <RulesListItem
                        text={
                            "The other non-designated players will be entered into the Keeper Lottery, where one will randomly be added to the draft pool"
                        }
                    />
                </RulesList>
                <RulesList header="Player Costs" showDivider>
                    <RulesListItem
                        text={"Player last acquired by Waiver"}
                        bolded={"ADP + 1"}
                    />
                    <RulesListItem
                        text={"Player drafted last season"}
                        bolded={"Draft Round - 1"}
                    />
                    <RulesListItem
                        text={"Player 2nd time kept"}
                        bolded={"Prev. keeper cost - 2"}
                    />
                    <RulesListItem
                        text={"Player 3nd time kept"}
                        bolded={"Prev. keeper cost - 3"}
                    />
                    <RulesListItem
                        text={"Player 4th time kept"}
                        bolded={"Prev. keeper cost - 5"}
                    />
                </RulesList>
                <RulesList header="Draft Lottery">
                    <RulesListItem
                        text={
                            "The draft lottery will commence 1 hour before the draft."
                        }
                    />
                </RulesList>
            </RuleCard>
        </Page>
    );
};

export default RulesPage;
