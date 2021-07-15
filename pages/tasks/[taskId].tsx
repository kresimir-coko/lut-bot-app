import ClayBreadcrumb from '@clayui/breadcrumb';
import ClayButton from '@clayui/button';
import ClayLabel from '@clayui/label';
import ClayLayout from '@clayui/layout';
import ClayLink from '@clayui/link';
import ClayPanel from '@clayui/panel';
import React, {useEffect, useRef, useState} from 'react';
import Terminal from 'react-console-emulator';
import useSWR from 'swr';

import TaskRecommendation from '../../components/TaskRecommendation';
import API_ENDPOINT from '../../constants/apiEndpoint';
import STATES from '../../constants/taskStates';
import cancelTask from '../../utils/cancelRunningTask';

const fetcher = (args) => fetch(args).then((res) => res.json());

export default function Task({lugbot, project, task, taskLog}) {
	const [stagedChanges, setStagedChanges] = useState([]);
	const terminalRef = useRef(null);

	const {data: log} = useSWR(
		`${API_ENDPOINT}/tasks/${task.id}/log`,
		fetcher,
		{
			initialData: taskLog,
			refreshInterval: 1000,
		}
	);

	const {displayType, label} = STATES.byId[task.state];

	const isCompleted = task.state === STATES.byName.complete.id;
	const isLocalInstance = lugbot.mode === 'LOCAL';

	function postStaged(add, locator) {
		fetch(`${API_ENDPOINT}/tasks/${task.id}/staged`, {
			body: JSON.stringify({add, locator}),
			method: 'POST',
		});
	}

	useEffect(() => {
		if (!isCompleted) {
			log.map((logLine) => {
				terminalRef.current.pushToStdout(logLine);
			});
		}
	}, [log]);

	return (
		<ClayLayout.ContainerFluid view>
			<ClayLayout.ContentRow>
				<ClayLayout.ContentCol>
					<ClayBreadcrumb
						ellipsisBuffer={1}
						items={[
							{
								href: `/tasks`,
								label: project.name
									? `${project.name} Tasks`
									: 'Tasks',
							},
							{
								active: true,
								label: task.name,
							},
						]}
					/>
				</ClayLayout.ContentCol>
			</ClayLayout.ContentRow>

			<ClayLayout.ContentRow containerElement="h1" float>
				<ClayLayout.ContentCol expand>
					{task.name}
				</ClayLayout.ContentCol>

				{isCompleted && (
					<>
						<ClayLayout.ContentCol expand>
							<ClayLink
								button
								displayType="secondary"
								href="#"
								style={{marginLeft: 'auto'}}
							>
								{'Download Report'}
							</ClayLink>
						</ClayLayout.ContentCol>

						<ClayLayout.ContentCol style={{marginLeft: 4}}>
							<ClayButton
								disabled={!stagedChanges.length}
								// @ts-ignore
								displayType={
									stagedChanges.length
										? 'success'
										: 'secondary'
								}
								onClick={() =>
									alert(
										`Sending PR with the following changes:\n ${stagedChanges.join(
											'\n'
										)}`
									)
								}
							>
								{isLocalInstance
									? `Merge (${stagedChanges.length})`
									: 'Send Pull Request (${stagedChanges.length})'}
							</ClayButton>
						</ClayLayout.ContentCol>
					</>
				)}

				{!isCompleted && (
					<ClayLayout.ContentCol>
						<ClayLink
							button
							className="btn-danger"
							href={`/tasks`}
							onClick={() => cancelTask(task.id)}
						>
							{'Cancel Task'}
						</ClayLink>
					</ClayLayout.ContentCol>
				)}
			</ClayLayout.ContentRow>

			<ClayLayout.ContentRow style={{marginBottom: 4}}>
				<ClayLayout.ContentCol>
					<ClayLabel displayType={displayType} large>
						{label}
					</ClayLabel>
				</ClayLayout.ContentCol>
			</ClayLayout.ContentRow>

			<ClayLayout.ContentRow>
				{!isCompleted && (
					<ClayLayout.ContentCol expand>
						<Terminal
							commands={{}}
							readOnly
							ref={terminalRef}
							style={{
								flex: 1,
								maxHeight: '300px',
							}}
							welcomeMessage="Running..."
						/>
					</ClayLayout.ContentCol>
				)}

				{isCompleted && (
					<ClayLayout.ContentCol expand>
						{task.recommendations && (
							<>
								<h2>{task.totalRecommendations} Issues: </h2>

								{Object.entries(task.recommendations).map(
									([file, comments]: any) => (
										<ClayPanel
											collapsable
											displayTitle={
												<span
													style={{
														textTransform: 'none',
													}}
												>
													({comments.length}) {file}
												</span>
											}
											displayType="secondary"
											key={file}
											showCollapseIcon={true}
										>
											{comments.map((comment, i) => {
												const isStaged =
													stagedChanges.indexOf(
														comment.id
													) !== -1;

												return (
													<TaskRecommendation
														comment={comment}
														comments={comments}
														index={i}
														key={comment.id}
														isStaged={isStaged}
														postStaged={postStaged}
														stagedChanges={
															stagedChanges
														}
														handleStagedChanges={
															setStagedChanges
														}
													/>
												);
											})}
										</ClayPanel>
									)
								)}
							</>
						)}

						{!task.recommendations && <p>No Recommendations</p>}
					</ClayLayout.ContentCol>
				)}
			</ClayLayout.ContentRow>
		</ClayLayout.ContainerFluid>
	);
}

export async function getServerSideProps(context) {
	const task = await fetch(
		`${API_ENDPOINT}/tasks/${context.query.taskId}`
	).then((res) => res.json());

	const {project} = await fetch(`${API_ENDPOINT}/status`).then((res) =>
		res.json()
	);

	const {lugbot} = await fetch(`${API_ENDPOINT}/status`).then((res) =>
		res.json()
	);

	const {taskLog} = await fetch(`${API_ENDPOINT}/tasks/${task.id}/log`).then(
		(res) => res.json()
	);

	return {
		props: {
			lugbot,
			project,
			task,
			taskLog,
		},
	};
}
